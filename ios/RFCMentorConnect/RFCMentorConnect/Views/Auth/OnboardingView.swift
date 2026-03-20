import SwiftUI

struct OnboardingView: View {
    @EnvironmentObject var auth: AuthService
    @State private var step = 1
    @State private var phone = ""
    @State private var code = ""
    @State private var newPassword = ""
    @State private var confirmPassword = ""
    @State private var isLoading = false
    @State private var errorMessage = ""
    @State private var showError = false

    var body: some View {
        ZStack {
            Color(hex: "F5F5F0").ignoresSafeArea()
            VStack(spacing: 0) {
                // Progress indicator
                HStack(spacing: 8) {
                    ForEach(1...3, id: \.self) { i in
                        Capsule()
                            .fill(i <= step ? Color(hex: "1B4332") : Color.gray.opacity(0.3))
                            .frame(height: 4)
                    }
                }
                .padding(.horizontal, 24)
                .padding(.top, 60)
                .padding(.bottom, 32)

                ScrollView {
                    VStack(spacing: 24) {
                        switch step {
                        case 1: phoneStep
                        case 2: verifyStep
                        case 3: passwordStep
                        default: EmptyView()
                        }
                    }
                    .padding(.horizontal, 24)
                }
            }
        }
    }

    private var phoneStep: some View {
        VStack(alignment: .leading, spacing: 20) {
            VStack(alignment: .leading, spacing: 8) {
                Text("Welcome!")
                    .font(.title.bold())
                    .foregroundColor(Color(hex: "1B4332"))
                Text("Please add your phone number for account verification.")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }

            VStack(alignment: .leading, spacing: 6) {
                Text("Phone Number")
                    .font(.caption.bold())
                    .foregroundColor(.secondary)
                TextField("+1 (555) 000-0000", text: $phone)
                    .textFieldStyle(RFCTextFieldStyle())
                    .keyboardType(.phonePad)
            }

            if showError {
                Text(errorMessage).font(.caption).foregroundColor(.red)
            }

            Button(action: sendCode) {
                actionButton(label: "Send Verification Code", loading: isLoading)
            }
            .disabled(isLoading || phone.isEmpty)
        }
    }

    private var verifyStep: some View {
        VStack(alignment: .leading, spacing: 20) {
            VStack(alignment: .leading, spacing: 8) {
                Text("Verify Your Phone")
                    .font(.title.bold())
                    .foregroundColor(Color(hex: "1B4332"))
                Text("Enter the 6-digit code sent to \(phone).")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }

            VStack(alignment: .leading, spacing: 6) {
                Text("Verification Code")
                    .font(.caption.bold())
                    .foregroundColor(.secondary)
                TextField("000000", text: $code)
                    .textFieldStyle(RFCTextFieldStyle())
                    .keyboardType(.numberPad)
            }

            if showError {
                Text(errorMessage).font(.caption).foregroundColor(.red)
            }

            Button(action: verifyCode) {
                actionButton(label: "Verify Code", loading: isLoading)
            }
            .disabled(isLoading || code.count < 6)

            Button("Resend Code") { sendCode() }
                .font(.subheadline)
                .foregroundColor(Color(hex: "1B4332"))
                .frame(maxWidth: .infinity)
        }
    }

    private var passwordStep: some View {
        VStack(alignment: .leading, spacing: 20) {
            VStack(alignment: .leading, spacing: 8) {
                Text("Create a Password")
                    .font(.title.bold())
                    .foregroundColor(Color(hex: "1B4332"))
                Text("Choose a strong password for your account.")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }

            VStack(alignment: .leading, spacing: 6) {
                Text("New Password")
                    .font(.caption.bold())
                    .foregroundColor(.secondary)
                SecureField("At least 8 characters", text: $newPassword)
                    .textFieldStyle(RFCTextFieldStyle())
            }

            VStack(alignment: .leading, spacing: 6) {
                Text("Confirm Password")
                    .font(.caption.bold())
                    .foregroundColor(.secondary)
                SecureField("Confirm password", text: $confirmPassword)
                    .textFieldStyle(RFCTextFieldStyle())
            }

            if showError {
                Text(errorMessage).font(.caption).foregroundColor(.red)
            }

            Button(action: createPassword) {
                actionButton(label: "Complete Setup", loading: isLoading)
            }
            .disabled(isLoading || newPassword.count < 8 || newPassword != confirmPassword)
        }
    }

    private func actionButton(label: String, loading: Bool) -> some View {
        Group {
            if loading {
                ProgressView().tint(.white)
            } else {
                Text(label).font(.headline)
            }
        }
        .frame(maxWidth: .infinity)
        .frame(height: 50)
        .background(Color(hex: "1B4332"))
        .foregroundColor(.white)
        .cornerRadius(12)
    }

    private func sendCode() {
        isLoading = true
        showError = false
        Task {
            do {
                try await APIClient.shared.sendVerification(phone: phone)
                step = 2
            } catch {
                errorMessage = error.localizedDescription
                showError = true
            }
            isLoading = false
        }
    }

    private func verifyCode() {
        isLoading = true
        showError = false
        Task {
            do {
                try await APIClient.shared.verifyPhone(code: code)
                step = 3
            } catch {
                errorMessage = error.localizedDescription
                showError = true
            }
            isLoading = false
        }
    }

    private func createPassword() {
        guard newPassword == confirmPassword else {
            errorMessage = "Passwords do not match"
            showError = true
            return
        }
        isLoading = true
        showError = false
        Task {
            do {
                try await APIClient.shared.changePassword(currentPassword: "", newPassword: newPassword)
                try await auth.completeOnboarding()
            } catch {
                errorMessage = error.localizedDescription
                showError = true
            }
            isLoading = false
        }
    }
}
