import SwiftUI

struct CreateUserView: View {
    @Environment(\.dismiss) var dismiss
    var initialRole: String

    @State private var name = ""
    @State private var email = ""
    @State private var role: String
    @State private var isLoading = false
    @State private var errorMessage = ""
    @State private var showError = false
    @State private var createdUser: CreateUserResponse?
    @State private var showSuccess = false

    init(initialRole: String) {
        self.initialRole = initialRole
        _role = State(initialValue: initialRole)
    }

    var body: some View {
        NavigationStack {
            ZStack {
                Color(hex: "F5F5F0").ignoresSafeArea()
                ScrollView {
                    VStack(spacing: 20) {
                        VStack(spacing: 16) {
                            formField(label: "Full Name", placeholder: "Jane Smith", text: $name)

                            formField(label: "Email Address", placeholder: "jane@example.com", text: $email)
                                .keyboardType(.emailAddress)
                                .textInputAutocapitalization(.never)

                            VStack(alignment: .leading, spacing: 6) {
                                Text("Role")
                                    .font(.caption.bold())
                                    .foregroundColor(.secondary)
                                Picker("Role", selection: $role) {
                                    Text("Patient").tag("patient")
                                    Text("Mentor").tag("mentor")
                                    Text("Admin").tag("admin")
                                }
                                .pickerStyle(.segmented)
                            }
                        }
                        .padding(20)
                        .background(Color.white)
                        .cornerRadius(16)
                        .shadow(color: .black.opacity(0.05), radius: 4, y: 2)
                        .padding(.horizontal, 16)

                        if showError {
                            Text(errorMessage)
                                .font(.caption)
                                .foregroundColor(.red)
                                .padding(.horizontal, 16)
                        }

                        Button(action: createUser) {
                            Group {
                                if isLoading {
                                    ProgressView().tint(.white)
                                } else {
                                    Text("Create \(role.capitalized)")
                                        .font(.headline)
                                }
                            }
                            .frame(maxWidth: .infinity)
                            .frame(height: 50)
                            .background(Color(hex: "1B4332"))
                            .foregroundColor(.white)
                            .cornerRadius(12)
                        }
                        .disabled(isLoading || name.isEmpty || email.isEmpty)
                        .padding(.horizontal, 16)
                    }
                    .padding(.top, 20)
                }
            }
            .navigationTitle("Create \(role.capitalized)")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") { dismiss() }
                        .foregroundColor(Color(hex: "1B4332"))
                }
            }
            .alert("Account Created", isPresented: $showSuccess, presenting: createdUser) { _ in
                Button("Copy & Close") {
                    if let u = createdUser {
                        UIPasteboard.general.string = "Username: \(u.username)\nPassword: \(u.tempPassword)"
                    }
                    dismiss()
                }
                Button("Close") { dismiss() }
            } message: { u in
                Text("Username: \(u.username)\n\nTemporary Password:\n\(u.tempPassword)\n\nA welcome email has been sent. Please also share these credentials securely.")
            }
        }
    }

    private func formField(label: String, placeholder: String, text: Binding<String>) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(label)
                .font(.caption.bold())
                .foregroundColor(.secondary)
            TextField(placeholder, text: text)
                .textFieldStyle(RFCTextFieldStyle())
        }
    }

    private func createUser() {
        isLoading = true
        showError = false
        Task {
            do {
                let response = try await APIClient.shared.createUser(name: name, email: email, role: role)
                createdUser = response
                showSuccess = true
            } catch {
                errorMessage = error.localizedDescription
                showError = true
            }
            isLoading = false
        }
    }
}
