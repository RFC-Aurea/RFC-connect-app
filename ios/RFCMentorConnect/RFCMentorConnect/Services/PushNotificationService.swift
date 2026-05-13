import Foundation
import UIKit
import UserNotifications

@MainActor
final class PushNotificationService: NSObject, ObservableObject {
    static let shared = PushNotificationService()

    /// Hex device token most recently issued by APNs. Stored so we can resend
    /// after a fresh login when the user wasn't authenticated at registration time.
    @Published private(set) var deviceTokenHex: String?

    private override init() { super.init() }

    func requestAuthorization() {
        let center = UNUserNotificationCenter.current()
        center.delegate = self
        center.requestAuthorization(options: [.alert, .badge, .sound]) { granted, error in
            if let error = error {
                print("[Push] Authorization error: \(error.localizedDescription)")
                return
            }
            guard granted else {
                print("[Push] Authorization denied by user")
                return
            }
            DispatchQueue.main.async {
                UIApplication.shared.registerForRemoteNotifications()
            }
        }
    }

    func didRegister(deviceToken: Data) {
        let hex = deviceToken.map { String(format: "%02x", $0) }.joined()
        deviceTokenHex = hex
        print("[Push] APNs token: \(hex)")
        sendTokenToServerIfPossible()
    }

    func sendTokenToServerIfPossible() {
        guard let token = deviceTokenHex,
              KeychainHelper.shared.read(for: "accessToken") != nil else { return }
        Task {
            do {
                try await APIClient.shared.registerDeviceToken(token: token)
            } catch {
                print("[Push] Failed to register device token: \(error.localizedDescription)")
            }
        }
    }
}

extension PushNotificationService: UNUserNotificationCenterDelegate {
    nonisolated func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification,
        withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
    ) {
        completionHandler([.banner, .sound, .badge])
    }
}
