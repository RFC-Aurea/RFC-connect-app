import SwiftUI
import UIKit

final class AppDelegate: NSObject, UIApplicationDelegate {
    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
    ) -> Bool {
        Task { @MainActor in
            PushNotificationService.shared.requestAuthorization()
        }
        return true
    }

    func application(
        _ application: UIApplication,
        didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data
    ) {
        Task { @MainActor in
            PushNotificationService.shared.didRegister(deviceToken: deviceToken)
        }
    }

    func application(
        _ application: UIApplication,
        didFailToRegisterForRemoteNotificationsWithError error: Error
    ) {
        print("[Push] Failed to register for remote notifications: \(error.localizedDescription)")
    }
}

@main
struct RFCMentorConnectApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) private var appDelegate
    @StateObject private var auth = AuthService.shared

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(auth)
        }
    }
}

struct InAppMessageBanner: Equatable {
    let senderName: String
    let preview: String
}

struct ContentView: View {
    @EnvironmentObject var auth: AuthService
    @ObservedObject private var socketService = SocketService.shared
    @ObservedObject private var pushService = PushNotificationService.shared
    @Environment(\.scenePhase) private var scenePhase

    @State private var activeCall: ActiveVideoCall?
    @State private var pendingCallReminder: CallReminder?
    @State private var showCallReminderAlert = false
    @State private var banner: InAppMessageBanner?
    @State private var bannerDismissTask: Task<Void, Never>?

    struct ActiveVideoCall: Identifiable {
        let id: Int
        let roomUrl: String
    }

    /// Unified incoming-call source — either from socket (foreground) or
    /// from a tapped push notification (background).
    private var currentIncomingCall: IncomingVideoCall? {
        if let socketCall = socketService.incomingCall { return socketCall }
        if let pushCall = pushService.pendingIncomingCall {
            return IncomingVideoCall(
                videoCallId: pushCall.videoCallId,
                roomUrl: pushCall.roomUrl,
                callerName: pushCall.callerName,
                callerId: 0
            )
        }
        return nil
    }

    var body: some View {
        Group {
            if auth.isLoading {
                splashScreen
            } else if !auth.isAuthenticated {
                LoginView()
            } else if auth.requiresOnboarding {
                OnboardingView()
            } else {
                RoleTabView()
            }
        }
        .overlay(alignment: .top) {
            if let banner {
                bannerView(banner)
                    .transition(.move(edge: .top).combined(with: .opacity))
                    .zIndex(1000)
            }
        }
        .animation(.easeInOut(duration: 0.25), value: banner)
        .preferredColorScheme(.light)
        .animation(.easeInOut(duration: 0.3), value: auth.isAuthenticated)
        .animation(.easeInOut(duration: 0.3), value: auth.requiresOnboarding)
        .onAppear {
            if auth.isAuthenticated {
                SocketService.shared.connect()
            }
        }
        .onChange(of: auth.isAuthenticated) { isAuth in
            if isAuth {
                SocketService.shared.connect()
                pushService.refreshBadgeCount()
            } else {
                SocketService.shared.disconnect()
                pushService.clearBadge()
            }
        }
        .onChange(of: scenePhase) { newPhase in
            if newPhase == .active && auth.isAuthenticated {
                pushService.refreshBadgeCount()
            }
        }
        .onChange(of: socketService.callReminder) { reminder in
            guard let reminder else { return }
            pendingCallReminder = reminder
            showCallReminderAlert = true
            socketService.acknowledgeCallReminder()
        }
        .onChange(of: socketService.receivedMessage) { msg in
            guard let msg,
                  let me = auth.currentUser?.id,
                  msg.senderId != me else { return }
            // Suppress banner when the user is already viewing this chat.
            if socketService.activeChatPartnerId == msg.senderId { return }
            let senderName = socketService.lastSenderName ?? "New message"
            let preview = previewForMessage(msg)
            banner = InAppMessageBanner(senderName: senderName, preview: preview)
            bannerDismissTask?.cancel()
            bannerDismissTask = Task {
                try? await Task.sleep(nanoseconds: 3_000_000_000)
                if !Task.isCancelled {
                    await MainActor.run {
                        if banner != nil { banner = nil }
                    }
                }
            }
        }
        .alert("Scheduled Video Call", isPresented: $showCallReminderAlert) {
            Button("Join") {
                if let reminder = pendingCallReminder {
                    activeCall = ActiveVideoCall(id: reminder.videoCallId, roomUrl: reminder.roomUrl)
                }
                pendingCallReminder = nil
            }
            Button("Later", role: .cancel) {
                pendingCallReminder = nil
            }
        } message: {
            Text("Your scheduled video call starts in 10 minutes. Join now?")
        }
        .fullScreenCover(item: $activeCall) { call in
            VideoCallView(videoCallId: call.id, roomUrl: call.roomUrl)
        }
        .fullScreenCover(
            isPresented: Binding(
                get: { currentIncomingCall != nil && activeCall == nil },
                set: { if !$0 {
                    socketService.clearIncomingCall()
                    pushService.clearPendingIncomingCall()
                } }
            )
        ) {
            if let incoming = currentIncomingCall {
                IncomingCallView(
                    videoCallId: incoming.videoCallId,
                    roomUrl: incoming.roomUrl,
                    callerName: incoming.callerName,
                    onAccept: { acceptIncoming(incoming) },
                    onReject: { rejectIncoming(incoming) }
                )
            }
        }
    }

    private func acceptIncoming(_ call: IncomingVideoCall) {
        socketService.clearIncomingCall()
        pushService.clearPendingIncomingCall()
        Task {
            do {
                _ = try await APIClient.shared.joinVideoCall(callId: call.videoCallId)
            } catch {
                print("[VideoCall] join API failed: \(error.localizedDescription)")
            }
            await MainActor.run {
                activeCall = ActiveVideoCall(id: call.videoCallId, roomUrl: call.roomUrl)
            }
        }
    }

    private func rejectIncoming(_ call: IncomingVideoCall) {
        socketService.clearIncomingCall()
        pushService.clearPendingIncomingCall()
        Task {
            do {
                try await APIClient.shared.rejectVideoCall(callId: call.videoCallId)
            } catch {
                print("[VideoCall] reject API failed: \(error.localizedDescription)")
            }
        }
    }

    private func bannerView(_ b: InAppMessageBanner) -> some View {
        HStack(spacing: 12) {
            Image(systemName: "message.fill")
                .foregroundColor(.white)
                .frame(width: 36, height: 36)
                .background(Color(hex: "1B4332"))
                .clipShape(Circle())
            VStack(alignment: .leading, spacing: 2) {
                Text(b.senderName)
                    .font(.subheadline.bold())
                    .foregroundColor(Color(hex: "1B4332"))
                    .lineLimit(1)
                Text(b.preview)
                    .font(.caption)
                    .foregroundColor(Color(hex: "666666"))
                    .lineLimit(2)
            }
            Spacer(minLength: 0)
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 10)
        .background(
            Color.white
                .shadow(color: .black.opacity(0.15), radius: 8, y: 4)
        )
        .cornerRadius(14)
        .padding(.horizontal, 12)
        .padding(.top, 8)
        .onTapGesture {
            bannerDismissTask?.cancel()
            banner = nil
        }
    }

    private func previewForMessage(_ msg: Message) -> String {
        switch msg.messageType {
        case "voice": return "Sent a voice message"
        case "photo", "image": return "Sent a photo"
        case "document": return "Sent a document"
        default:
            return msg.content.count > 100 ? String(msg.content.prefix(100)) : msg.content
        }
    }

    private var splashScreen: some View {
        ZStack {
            Color(hex: "1B4332").ignoresSafeArea()
            VStack(spacing: 16) {
                Image("RFCLogo")
                    .resizable()
                    .scaledToFit()
                    .frame(width: 100, height: 100)
                    .clipShape(RoundedRectangle(cornerRadius: 22))
                Text("RFC Mentor Connect")
                    .font(.title.bold())
                    .foregroundColor(.white)
                ProgressView()
                    .tint(.white)
            }
        }
    }
}

struct RoleTabView: View {
    @EnvironmentObject var auth: AuthService

    var body: some View {
        switch auth.currentUser?.role {
        case .admin:
            TabView {
                AdminDashboardView()
                    .tabItem { Label("Dashboard", systemImage: "chart.bar.fill") }
                SettingsView()
                    .tabItem { Label("Settings", systemImage: "gear") }
            }
            .tint(Color(hex: "1B4332"))

        case .mentor:
            TabView {
                MentorDashboardView()
                    .tabItem { Label("Dashboard", systemImage: "person.2.fill") }
                MentorResourcesView()
                    .tabItem { Label("Resources", systemImage: "books.vertical.fill") }
                SettingsView()
                    .tabItem { Label("Settings", systemImage: "gear") }
            }
            .tint(Color(hex: "1B4332"))

        case .patient:
            TabView {
                PatientDashboardView()
                    .tabItem { Label("Dashboard", systemImage: "house.fill") }
                JourneyHubView()
                    .tabItem { Label("Journey", systemImage: "map.fill") }
                SettingsView()
                    .tabItem { Label("Settings", systemImage: "gear") }
            }
            .tint(Color(hex: "1B4332"))

        default:
            LoginView()
        }
    }
}
