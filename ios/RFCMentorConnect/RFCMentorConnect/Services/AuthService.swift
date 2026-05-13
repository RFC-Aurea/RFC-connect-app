import Foundation
import Combine

@MainActor
final class AuthService: ObservableObject {
    static let shared = AuthService()

    @Published var currentUser: User?
    @Published var isAuthenticated = false
    @Published var isLoading = true
    @Published var requiresOnboarding = false

    private init() {
        NotificationCenter.default.addObserver(
            forName: .authSessionExpired,
            object: nil,
            queue: .main
        ) { [weak self] _ in
            Task { @MainActor in self?.logout() }
        }
        Task { await checkAuthState() }
    }

    func checkAuthState() async {
        isLoading = true
        defer { isLoading = false }
        guard KeychainHelper.shared.read(for: "accessToken") != nil else {
            isAuthenticated = false
            return
        }
        do {
            let user = try await APIClient.shared.getMe()
            currentUser = user
            isAuthenticated = true
            requiresOnboarding = user.mustChangePassword
        } catch APIError.unauthorized {
            isAuthenticated = false
            clearTokens()
        } catch {
            // Keep session if network error
            isAuthenticated = true
        }
    }

    func login(email: String, password: String) async throws -> APIClient.LoginResponse {
        let response = try await APIClient.shared.login(email: email, password: password)
        if let access = response.accessToken, let refresh = response.refreshToken {
            KeychainHelper.shared.save(access, for: "accessToken")
            KeychainHelper.shared.save(refresh, for: "refreshToken")
            currentUser = response.user
            isAuthenticated = true
            requiresOnboarding = response.user?.mustChangePassword ?? false
        }
        return response
    }

    func completeLogin(userId: Int, code: String) async throws -> APIClient.LoginResponse {
        let response = try await APIClient.shared.completeLogin(userId: userId, code: code)
        if let access = response.accessToken, let refresh = response.refreshToken {
            KeychainHelper.shared.save(access, for: "accessToken")
            KeychainHelper.shared.save(refresh, for: "refreshToken")
            currentUser = response.user
            isAuthenticated = true
            requiresOnboarding = response.user?.mustChangePassword ?? false
        }
        return response
    }

    func logout() {
        if let refresh = KeychainHelper.shared.read(for: "refreshToken") {
            Task { try? await APIClient.shared.logoutMobile(refreshToken: refresh) }
        }
        clearTokens()
        currentUser = nil
        isAuthenticated = false
        requiresOnboarding = false
    }

    private func clearTokens() {
        KeychainHelper.shared.delete(for: "accessToken")
        KeychainHelper.shared.delete(for: "refreshToken")
    }

    func completeOnboarding() async throws {
        let user = try await APIClient.shared.getMe()
        currentUser = user
        requiresOnboarding = false
    }
}
