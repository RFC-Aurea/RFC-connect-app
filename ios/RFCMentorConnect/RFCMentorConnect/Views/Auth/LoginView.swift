import SwiftUI

struct LoginView: View {
    @EnvironmentObject var auth: AuthService
    @State private var email = ""
    @State private var password = ""
    @State private var isLoading = false
    @State private var errorMessage = ""
    @State private var showError = false
    @State private var showVerification = false
    @State private var verificationCode = ""
    @State private var verificationUserId: Int? = nil

    var body: some View {
        ZStack {
            Color(hex: "F5F5F0").ignoresSafeArea()
            if showVerification {
                verificationView
            } else {
                loginForm
            }
        }
    }

    private var loginForm: some View {
        ScrollView {
            VStack(spacing: 32) {
                Spacer(minLength: 60)

                // Logo / Branding
                VStack(spacing: 12) {
                    ZStack {
                        Circle()
                            .fill(Color(hex: "1B4332"))
                            .frame(width: 88, height: 88)
                        Image(systemName: "heart.fill")
                            .resizable()
                            .scaledToFit()
                            .frame(width: 40, height: 40)
                            .foregroundColor(Color(hex: "B8860B"))
                    }
                    Text("RFC Mentor Connect")
                        .font(.title.bold())
                        .foregroundColor(Color(hex: "1B4332"))
                    Text("Fertility Hope Connect")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }

                // Form
                VStack(spacing: 16) {
                    VStack(alignment: .leading, spacing: 6) {
                        Text("Email")
                            .font(.caption.bold())
                            .foregroundColor(.secondary)
                        TextField("your@email.com", text: $email)
                            .textFieldStyle(RFCTextFieldStyle())
                            .keyboardType(.emailAddress)
                            .textInputAutocapitalization(.never)
                            .autocorrectionDisabled()
                    }

                    VStack(alignment: .leading, spacing: 6) {
                        Text("Password")
                            .font(.caption.bold())
                            .foregroundColor(.secondary)
                        SecureField("Password", text: $password)
                            .textFieldStyle(RFCTextFieldStyle())
                    }

                    if showError {
                        Text(errorMessage)
                            .font(.caption)
                            .foregroundColor(.red)
                            .frame(maxWidth: .infinity, alignment: .leading)
                    }

                    Button(action: signIn) {
                        Group {
                            if isLoading {
                                ProgressView().tint(.white)
                            } else {
                                Text("Sign In")
                                    .font(.headline)
                            }
                        }
                        .frame(maxWidth: .infinity)
                        .frame(height: 50)
                        .background(Color(hex: "1B4332"))
                        .foregroundColor(.white)
                        .cornerRadius(12)
                    }
                    .disabled(isLoading || email.isEmpty || password.isEmpty)
                    .opacity((email.isEmpty || password.isEmpty) ? 0.6 : 1)
                }
                .padding(.horizontal, 24)

                Spacer(minLength: 40)
            }
        }
    }

    private var verificationView: some View {
        ScrollView {
            VStack(spacing: 32) {
                Spacer(minLength: 60)

                VStack(spacing: 12) {
                    ZStack {
                        Circle()
                            .fill(Color(hex: "1B4332"))
                            .frame(width: 88, height: 88)
                        Image(systemName: "lock.shield.fill")
                            .resizable()
                            .scaledToFit()
                            .frame(width: 40, height: 40)
                            .foregroundColor(Color(hex: "B8860B"))
                    }
                    Text("Enter Verification Code")
                        .font(.title.bold())
                        .foregroundColor(Color(hex: "1B4332"))
                    Text("A code was sent to your phone")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }

                VStack(spacing: 16) {
                    VStack(alignment: .leading, spacing: 6) {
                        Text("6-Digit Code")
                            .font(.caption.bold())
                            .foregroundColor(.secondary)
                        TextField("000000", text: $verificationCode)
                            .textFieldStyle(RFCTextFieldStyle())
                            .keyboardType(.numberPad)
                            .textInputAutocapitalization(.never)
                            .autocorrectionDisabled()
                    }

                    if showError {
                        Text(errorMessage)
                            .font(.caption)
                            .foregroundColor(.red)
                            .frame(maxWidth: .infinity, alignment: .leading)
                    }

                    Button(action: verify) {
                        Group {
                            if isLoading {
                                ProgressView().tint(.white)
                            } else {
                                Text("Verify")
                                    .font(.headline)
                            }
                        }
                        .frame(maxWidth: .infinity)
                        .frame(height: 50)
                        .background(Color(hex: "1B4332"))
                        .foregroundColor(.white)
                        .cornerRadius(12)
                    }
                    .disabled(isLoading || verificationCode.isEmpty)
                    .opacity(verificationCode.isEmpty ? 0.6 : 1)

                    Button(action: { showVerification = false; verificationCode = "" }) {
                        Text("Back to Sign In")
                            .font(.subheadline)
                            .foregroundColor(Color(hex: "1B4332"))
                    }
                }
                .padding(.horizontal, 24)

                Spacer(minLength: 40)
            }
        }
    }

    private func signIn() {
        isLoading = true
        showError = false
        Task {
            do {
                let response = try await auth.login(email: email, password: password)
                if response.requiresVerification == true, let userId = response.userId {
                    verificationUserId = userId
                    showVerification = true
                }
            } catch {
                errorMessage = error.localizedDescription
                showError = true
            }
            isLoading = false
        }
    }

    private func verify() {
        guard let userId = verificationUserId else { return }
        isLoading = true
        showError = false
        Task {
            do {
                _ = try await auth.completeLogin(userId: userId, code: verificationCode)
            } catch {
                errorMessage = error.localizedDescription
                showError = true
            }
            isLoading = false
        }
    }
}

struct RFCTextFieldStyle: TextFieldStyle {
    func _body(configuration: TextField<Self._Label>) -> some View {
        configuration
            .padding(14)
            .background(Color.white)
            .cornerRadius(10)
            .overlay(RoundedRectangle(cornerRadius: 10).stroke(Color.gray.opacity(0.2)))
    }
}

extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3:
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6:
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8:
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (255, 0, 0, 0)
        }
        self.init(.sRGB, red: Double(r)/255, green: Double(g)/255, blue: Double(b)/255, opacity: Double(a)/255)
    }
}
