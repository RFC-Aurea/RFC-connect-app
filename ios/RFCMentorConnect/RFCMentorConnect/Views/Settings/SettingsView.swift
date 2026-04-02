import SwiftUI

struct SettingsView: View {
    @EnvironmentObject var auth: AuthService
    @State private var showChangePassword = false
    @State private var showDeleteAlert = false
    @State private var currentPassword = ""
    @State private var newPassword = ""
    @State private var confirmNewPassword = ""
    @State private var isChangingPassword = false
    @State private var passwordError = ""
    @State private var passwordSuccess = false

    var body: some View {
        NavigationStack {
            ZStack {
                Color(hex: "F5F5F0").ignoresSafeArea()
                List {
                    // Profile section
                    Section {
                        if let user = auth.currentUser {
                            HStack(spacing: 14) {
                                Circle()
                                    .fill(Color(hex: "1B4332").opacity(0.15))
                                    .frame(width: 60, height: 60)
                                    .overlay(
                                        Text(user.name.prefix(1).uppercased())
                                            .font(.title2.bold())
                                            .foregroundColor(Color(hex: "1B4332"))
                                    )
                                VStack(alignment: .leading, spacing: 4) {
                                    Text(user.name).font(.headline)
                                    Text(user.email).font(.caption).foregroundColor(Color(hex: "666666"))
                                    Text(user.role.rawValue.capitalized)
                                        .font(.caption.bold())
                                        .padding(.horizontal, 8)
                                        .padding(.vertical, 2)
                                        .background(Color(hex: "1B4332").opacity(0.1))
                                        .foregroundColor(Color(hex: "1B4332"))
                                        .cornerRadius(6)
                                    if let username = user.username {
                                        Text("@\(username)").font(.caption).foregroundColor(Color(hex: "666666"))
                                    }
                                }
                            }
                            .padding(.vertical, 8)
                        }
                    }

                    // Security
                    Section("Security") {
                        Button(action: { showChangePassword = true }) {
                            Label("Change Password", systemImage: "lock.rotation")
                                .foregroundColor(Color(hex: "1B4332"))
                        }
                    }

                    // Legal
                    Section("Legal") {
                        Link(destination: URL(string: "https://www.rejuvenatingfertility.com/privacy-policy")!) {
                            Label("Privacy Policy", systemImage: "hand.raised.fill")
                                .foregroundColor(Color(hex: "1B4332"))
                        }
                        Link(destination: URL(string: "https://www.rejuvenatingfertility.com/terms-of-service")!) {
                            Label("Terms of Service", systemImage: "doc.text.fill")
                                .foregroundColor(Color(hex: "1B4332"))
                        }
                    }

                    // About
                    Section("About") {
                        HStack {
                            Label("Version", systemImage: "info.circle")
                            Spacer()
                            Text("1.0.0").foregroundColor(Color(hex: "666666"))
                        }
                        HStack {
                            Label("Build", systemImage: "hammer")
                            Spacer()
                            Text("RFC Mentor Connect").foregroundColor(Color(hex: "666666"))
                        }
                    }

                    // Account actions
                    Section {
                        Button(action: { auth.logout() }) {
                            HStack {
                                Image(systemName: "rectangle.portrait.and.arrow.right")
                                    .foregroundColor(.red)
                                Text("Sign Out")
                                    .foregroundColor(.red)
                            }
                        }

                        Button(action: { showDeleteAlert = true }) {
                            HStack {
                                Image(systemName: "trash")
                                    .foregroundColor(.red)
                                Text("Delete My Account")
                                    .foregroundColor(.red)
                            }
                        }
                    }
                }
                .scrollContentBackground(.hidden)
            }
            .navigationTitle("Settings")
            .sheet(isPresented: $showChangePassword) {
                changePasswordSheet
            }
            .alert("Delete Account", isPresented: $showDeleteAlert) {
                Button("Delete", role: .destructive) {
                    // Contact support to delete account
                }
                Button("Cancel", role: .cancel) {}
            } message: {
                Text("To delete your account, please contact RFC support at support@rfcfertility.com. This action is irreversible.")
            }
        }
    }

    private var changePasswordSheet: some View {
        NavigationStack {
            ZStack {
                Color(hex: "F5F5F0").ignoresSafeArea()
                VStack(spacing: 20) {
                    VStack(spacing: 16) {
                        VStack(alignment: .leading, spacing: 6) {
                            Text("Current Password").font(.caption.bold()).foregroundColor(Color(hex: "666666"))
                            SecureField("Current password", text: $currentPassword)
                                .textFieldStyle(RFCTextFieldStyle())
                        }
                        VStack(alignment: .leading, spacing: 6) {
                            Text("New Password").font(.caption.bold()).foregroundColor(Color(hex: "666666"))
                            SecureField("At least 8 characters", text: $newPassword)
                                .textFieldStyle(RFCTextFieldStyle())
                        }
                        VStack(alignment: .leading, spacing: 6) {
                            Text("Confirm New Password").font(.caption.bold()).foregroundColor(Color(hex: "666666"))
                            SecureField("Confirm new password", text: $confirmNewPassword)
                                .textFieldStyle(RFCTextFieldStyle())
                        }
                    }
                    .padding(20)
                    .background(Color.white)
                    .cornerRadius(16)

                    if !passwordError.isEmpty {
                        Text(passwordError).font(.caption).foregroundColor(.red)
                    }

                    Button(action: changePassword) {
                        Group {
                            if isChangingPassword {
                                ProgressView().tint(.white)
                            } else {
                                Text("Update Password").font(.headline)
                            }
                        }
                        .frame(maxWidth: .infinity)
                        .frame(height: 50)
                        .background(Color(hex: "1B4332"))
                        .foregroundColor(.white)
                        .cornerRadius(12)
                    }
                    .disabled(isChangingPassword || currentPassword.isEmpty || newPassword.count < 8 || newPassword != confirmNewPassword)

                    Spacer()
                }
                .padding(16)
            }
            .navigationTitle("Change Password")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") { showChangePassword = false }
                        .foregroundColor(Color(hex: "1B4332"))
                }
            }
            .alert("Password Updated", isPresented: $passwordSuccess) {
                Button("OK") { showChangePassword = false }
            } message: {
                Text("Your password has been updated successfully.")
            }
        }
    }

    private func changePassword() {
        guard newPassword == confirmNewPassword else {
            passwordError = "New passwords do not match"
            return
        }
        isChangingPassword = true
        passwordError = ""
        Task {
            do {
                try await APIClient.shared.changePassword(currentPassword: currentPassword, newPassword: newPassword)
                passwordSuccess = true
            } catch {
                passwordError = error.localizedDescription
            }
            isChangingPassword = false
        }
    }
}

struct WebContentView: View {
    let title: String
    let urlString: String

    var body: some View {
        Text("Opening \(title)...")
            .onAppear {
                if let url = URL(string: urlString) {
                    UIApplication.shared.open(url)
                }
            }
            .navigationTitle(title)
    }
}
