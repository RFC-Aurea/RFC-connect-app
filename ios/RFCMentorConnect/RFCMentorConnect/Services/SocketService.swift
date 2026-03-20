import Foundation
import SocketIO

@MainActor
final class SocketService: ObservableObject {
    static let shared = SocketService()

    @Published var receivedMessage: Message?
    @Published var typingUserId: Int?

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

        socket?.on(clientEvent: .connect) { [weak self] _, _ in
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
}
