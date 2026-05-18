import Foundation
import UIKit
import UserNotifications

struct PendingIncomingCall: Equatable {
    let videoCallId: Int
    let roomUrl: String
    let callerName: String
}

@MainActor
final class PushNotificationService: NSObject, ObservableObject {
    static let shared = PushNotificationService()

    /// Hex device token most recently issued by APNs. Stored so we can resend
    /// after a fresh login when the user wasn't authenticated at registration time.
    @Published private(set) var deviceTokenHex: String?

    /// Set when the user taps a video-call push notification. RFCMentorConnectApp
    /// observes this to present IncomingCallView.
    @Published var pendingIncomingCall: PendingIncomingCall?

    private override init() { super.init() }

    func clearPendingIncomingCall() {
        pendingIncomingCall = nil
    }

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

    func refreshBadgeCount() {
        guard KeychainHelper.shared.read(for: "accessToken") != nil else {
            UIApplication.shared.applicationIconBadgeNumber = 0
            return
        }
        Task {
            do {
                let counts = try await APIClient.shared.getUnreadCounts()
                await MainActor.run {
                    UIApplication.shared.applicationIconBadgeNumber = counts.totalUnread
                }
            } catch {
                print("[Push] Failed to refresh badge count: \(error.localizedDescription)")
            }
        }
    }

    func clearBadge() {
        UIApplication.shared.applicationIconBadgeNumber = 0
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

    nonisolated func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse,
        withCompletionHandler completionHandler: @escaping () -> Void
    ) {
        let userInfo = response.notification.request.content.userInfo
        if let type = userInfo["type"] as? String,
           type == "video_call",
           let videoCallId = userInfo["videoCallId"] as? Int,
           let roomUrl = userInfo["roomUrl"] as? String {
            let body = response.notification.request.content.body
            let suffix = " is calling you"
            let callerName = body.hasSuffix(suffix)
                ? String(body.dropLast(suffix.count))
                : body
            Task { @MainActor in
                PushNotificationService.shared.pendingIncomingCall = PendingIncomingCall(
                    videoCallId: videoCallId,
                    roomUrl: roomUrl,
                    callerName: callerName
                )
            }
        } else if let type = userInfo["type"] as? String,
                  type == "video_call_reminder",
                  let videoCallId = userInfo["videoCallId"] as? Int,
                  let roomUrl = userInfo["roomUrl"] as? String {
            Task { @MainActor in
                SocketService.shared.callReminder = CallReminder(
                    videoCallId: videoCallId,
                    roomUrl: roomUrl
                )
            }
        }
        completionHandler()
    }
}
