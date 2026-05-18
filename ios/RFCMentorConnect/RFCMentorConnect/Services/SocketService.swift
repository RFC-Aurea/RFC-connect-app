import Foundation
import SocketIO

struct IncomingVideoCall: Equatable {
    let videoCallId: Int
    let roomUrl: String
    let callerName: String
    let callerId: Int
}

struct CallReminder: Equatable {
    let videoCallId: Int
    let roomUrl: String
}

struct MessageReadEvent: Equatable {
    let messageId: Int
    let readAt: String
}

@MainActor
final class SocketService: ObservableObject {
    static let shared = SocketService()

    @Published var receivedMessage: Message?
    /// Display name of the most recent message sender — used for in-app banners.
    @Published var lastSenderName: String?
    @Published var typingUserId: Int?
    /// Set when a peer (or another device of the current user) deletes a message
    /// "for everyone". ChatView observes this to flip the bubble to the tombstone.
    @Published var deletedMessageId: Int?

    @Published var incomingCall: IncomingVideoCall?
    /// Set when the partner ends or rejects the active call so the UI can dismiss.
    @Published var endedCallId: Int?

    /// Most recent read receipt — observed by ChatView to mark a sent message as read.
    @Published var readMessage: MessageReadEvent?
    /// Set 10 minutes before a scheduled call so the app can prompt the user to join.
    @Published var callReminder: CallReminder?
    /// The partner currently viewed in ChatView. ContentView uses this to decide
    /// whether to surface an in-app banner for incoming messages.
    @Published var activeChatPartnerId: Int?

    private var manager: SocketManager?
    private var socket: SocketIOClient?

    private init() {}

    func connect() {
        guard let token = KeychainHelper.shared.read(for: "accessToken"),
              let url = URL(string: APIClient.shared.baseURL) else { return }

        manager = SocketManager(socketURL: url, config: [
            .log(false),
            .compress,
            .extraHeaders(["Authorization": "Bearer \(token)"]),
            .reconnects(true),
            .reconnectWait(3)
        ])
        socket = manager?.defaultSocket

        socket?.on(clientEvent: .connect) { _, _ in
            print("[Socket] Connected")
        }

        socket?.on("message:received") { [weak self] data, _ in
            guard let self,
                  let raw = data.first as? [String: Any],
                  let messageDict = raw["message"] as? [String: Any],
                  let jsonData = try? JSONSerialization.data(withJSONObject: messageDict),
                  let message = try? JSONDecoder().decode(Message.self, from: jsonData) else { return }
            let senderName = (raw["sender"] as? [String: Any])?["name"] as? String
            Task { @MainActor in
                self.lastSenderName = senderName
                self.receivedMessage = message
            }
        }

        socket?.on("message:deleted") { [weak self] data, _ in
            guard let self,
                  let dict = data.first as? [String: Any],
                  let messageId = dict["messageId"] as? Int else { return }
            Task { @MainActor in self.deletedMessageId = messageId }
        }

        socket?.on("message:read") { [weak self] data, _ in
            guard let self,
                  let dict = data.first as? [String: Any],
                  let messageId = dict["messageId"] as? Int else { return }
            let readAt = (dict["readAt"] as? String) ?? ISO8601DateFormatter().string(from: Date())
            Task { @MainActor in
                self.readMessage = MessageReadEvent(messageId: messageId, readAt: readAt)
            }
        }

        socket?.on("video-call:reminder") { [weak self] data, _ in
            guard let self,
                  let dict = data.first as? [String: Any],
                  let id = dict["videoCallId"] as? Int,
                  let roomUrl = dict["roomUrl"] as? String else { return }
            Task { @MainActor in
                self.callReminder = CallReminder(videoCallId: id, roomUrl: roomUrl)
            }
        }

        socket?.on("typing:start") { [weak self] data, _ in
            guard let self,
                  let dict = data.first as? [String: Any],
                  let userId = dict["userId"] as? Int else { return }
            Task { @MainActor in self.typingUserId = userId }
        }

        socket?.on("typing:stop") { [weak self] data, _ in
            guard let self,
                  let dict = data.first as? [String: Any],
                  let userId = dict["userId"] as? Int else { return }
            Task { @MainActor in
                if self.typingUserId == userId { self.typingUserId = nil }
            }
        }

        socket?.on("video-call:incoming") { [weak self] data, _ in
            guard let self,
                  let dict = data.first as? [String: Any],
                  let videoCallId = dict["videoCallId"] as? Int,
                  let roomUrl = dict["roomUrl"] as? String,
                  let callerName = dict["callerName"] as? String,
                  let callerId = dict["callerId"] as? Int else { return }
            Task { @MainActor in
                // Ignore echoes back to the caller's other sockets.
                if callerId != AuthService.shared.currentUser?.id {
                    self.incomingCall = IncomingVideoCall(
                        videoCallId: videoCallId,
                        roomUrl: roomUrl,
                        callerName: callerName,
                        callerId: callerId
                    )
                }
            }
        }

        socket?.on("video-call:ended") { [weak self] data, _ in
            guard let self,
                  let dict = data.first as? [String: Any],
                  let id = dict["videoCallId"] as? Int else { return }
            Task { @MainActor in
                if self.incomingCall?.videoCallId == id { self.incomingCall = nil }
                self.endedCallId = id
            }
        }

        socket?.on("video-call:rejected") { [weak self] data, _ in
            guard let self,
                  let dict = data.first as? [String: Any],
                  let id = dict["videoCallId"] as? Int else { return }
            Task { @MainActor in
                if self.incomingCall?.videoCallId == id { self.incomingCall = nil }
                self.endedCallId = id
            }
        }

        socket?.on(clientEvent: .disconnect) { _, _ in
            print("[Socket] Disconnected")
        }

        socket?.connect()
    }

    func disconnect() {
        socket?.disconnect()
        socket = nil
        manager = nil
    }

    func sendMessage(to userId: Int, content: String) {
        socket?.emit("message:send", ["partnerId": userId, "content": content])
    }

    func startTyping(to userId: Int) {
        socket?.emit("typing:start", ["partnerId": userId])
    }

    func stopTyping(to userId: Int) {
        socket?.emit("typing:stop", ["partnerId": userId])
    }

    func clearIncomingCall() { incomingCall = nil }
    func acknowledgeEndedCall() { endedCallId = nil }
    func acknowledgeDeletedMessage() { deletedMessageId = nil }
    func acknowledgeReadMessage() { readMessage = nil }
    func acknowledgeCallReminder() { callReminder = nil }
}
