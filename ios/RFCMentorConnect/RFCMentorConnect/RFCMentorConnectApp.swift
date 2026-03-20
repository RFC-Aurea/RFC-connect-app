import SwiftUI

@main
struct RFCMentorConnectApp: App {
    @StateObject private var auth = AuthService.shared

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(auth)
        }
    }
}

struct ContentView: View {
    @EnvironmentObject var auth: AuthService

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
            } else {
                SocketService.shared.disconnect()
            }
        }
    }

    private var splashScreen: some View {
        ZStack {
            Color(hex: "1B4332").ignoresSafeArea()
            VStack(spacing: 16) {
                ZStack {
                    Circle()
                        .fill(Color.white.opacity(0.15))
                        .frame(width: 100, height: 100)
                    Image(systemName: "heart.fill")
                        .resizable()
                        .scaledToFit()
                        .frame(width: 50, height: 50)
                        .foregroundColor(Color(hex: "B8860B"))
                }
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
