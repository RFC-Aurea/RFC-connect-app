import Foundation
import SocketIO

struct IncomingVideoCall: Equatable {
    let videoCallId: Int
    let roomUrl: String
    let callerName: String
    let callerId: Int
}

@MainActor
final class SocketService: ObservableObject {
    static let shared = SocketService()

    @Published var receivedMessage: Message?
    @Published var typingUserId: Int?

    @Published var incomingCall: IncomingVideoCall?
    /// Set when the partner ends or rejects the active call so the UI can dismiss.
    @Published var endedCallId: Int?

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
                  let jsonData = try? JSONSerialization.data(withJSONObject: raw),
                  let message = try? JSONDecoder().decode(Message.self, from: jsonData) else { return }
            Task { @MainActor in
                self.receivedMessage = message
            }
        }

        socket?.on("typing:start") { [weak self] data, _ in
            guard let self, let userId = data.first as? Int else { return }
            Task { @MainActor in self.typingUserId = userId }
        }

        socket?.on("typing:stop") { [weak self] data, _ in
            guard let self, let userId = data.first as? Int else { return }
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
                        callerId: callerId,
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
        socket?.emit("message:send", ["receiverId": userId, "content": content])
    }

    func startTyping(to userId: Int) {
        socket?.emit("typing:start", ["receiverId": userId])
    }

    func stopTyping(to userId: Int) {
        socket?.emit("typing:stop", ["receiverId": userId])
    }

    func clearIncomingCall() { incomingCall = nil }
    func acknowledgeEndedCall() { endedCallId = nil }
}
