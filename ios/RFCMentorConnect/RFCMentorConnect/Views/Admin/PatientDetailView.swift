import SwiftUI

struct PatientDetailView: View {
    @Environment(\.dismiss) var dismiss
    let patient: PatientSummary
    let overview: AdminOverview?

    @State private var selectedPhase: String
    @State private var selectedMentorId: Int?
    @State private var isLoading = false
    @State private var successMessage = ""
    @State private var showSuccess = false
    @State private var errorMessage = ""
    @State private var showError = false
    @State private var showDeleteConfirm = false

    private let phases = [
        "Pre-Consult & Decision", "Testing & Diagnosis", "Stimulation",
        "Retrieval & Fertilization", "Transfer Prep", "Two Week Wait",
        "Early Pregnancy", "Postpartum/Graduation"
    ]

    init(patient: PatientSummary, overview: AdminOverview?) {
        self.patient = patient
        self.overview = overview
        _selectedPhase = State(initialValue: patient.phase ?? "Pre-Consult & Decision")
        _selectedMentorId = State(initialValue: patient.mentorId)
    }

    var body: some View {
        NavigationStack {
            ZStack {
                Color(hex: "F5F5F0").ignoresSafeArea()
                ScrollView {
                    VStack(spacing: 20) {
                        // Patient info card
                        VStack(spacing: 12) {
                            Circle()
                                .fill(Color(hex: "1B4332").opacity(0.15))
                                .frame(width: 72, height: 72)
                                .overlay(
                                    Text(patient.name.prefix(1).uppercased())
                                        .font(.title.bold())
                                        .foregroundColor(Color(hex: "1B4332"))
                                )
                            Text(patient.name)
                                .font(.title3.bold())
                            Text(patient.email)
                                .font(.subheadline)
                                .foregroundColor(Color(hex: "666666"))
                            if let username = patient.username {
                                Text("@\(username)")
                                    .font(.caption)
                                    .foregroundColor(Color(hex: "666666"))
                            }
                        }
                        .frame(maxWidth: .infinity)
                        .padding(20)
                        .background(Color.white)
                        .cornerRadius(16)
                        .shadow(color: .black.opacity(0.05), radius: 4, y: 2)
                        .padding(.horizontal, 16)

                        // Phase selector
                        VStack(alignment: .leading, spacing: 10) {
                            Text("Fertility Phase")
                                .font(.headline)
                                .padding(.horizontal, 16)

                            VStack(spacing: 0) {
                                Picker("Phase", selection: $selectedPhase) {
                                    ForEach(phases, id: \.self) { phase in
                                        Text(phase).tag(phase)
                                    }
                                }
                                .pickerStyle(.wheel)
                                .frame(height: 160)
                            }
                            .background(Color.white)
                            .cornerRadius(16)
                            .shadow(color: .black.opacity(0.05), radius: 4, y: 2)
                            .padding(.horizontal, 16)

                            Button(action: updatePhase) {
                                saveButton(label: "Update Phase")
                            }
                            .padding(.horizontal, 16)
                        }

                        // Mentor selector
                        if let mentors = overview?.mentors, !mentors.isEmpty {
                            VStack(alignment: .leading, spacing: 10) {
                                Text("Assign Mentor")
                                    .font(.headline)
                                    .padding(.horizontal, 16)

                                VStack(spacing: 0) {
                                    ForEach(mentors) { mentor in
                                        HStack {
                                            VStack(alignment: .leading, spacing: 2) {
                                                Text(mentor.name).font(.subheadline.bold())
                                                Text(mentor.email).font(.caption).foregroundColor(Color(hex: "666666"))
                                            }
                                            Spacer()
                                            if selectedMentorId == mentor.id {
                                                Image(systemName: "checkmark.circle.fill")
                                                    .foregroundColor(Color(hex: "1B4332"))
                                            }
                                        }
                                        .padding(16)
                                        .contentShape(Rectangle())
                                        .onTapGesture { selectedMentorId = mentor.id }
                                        if mentor.id != mentors.last?.id {
                                            Divider().padding(.leading, 16)
                                        }
                                    }
                                }
                                .background(Color.white)
                                .cornerRadius(16)
                                .shadow(color: .black.opacity(0.05), radius: 4, y: 2)
                                .padding(.horizontal, 16)

                                Button(action: assignMentor) {
                                    saveButton(label: "Assign Mentor")
                                }
                                .disabled(selectedMentorId == nil)
                                .padding(.horizontal, 16)
                            }
                        }

                        if showError {
                            Text(errorMessage).font(.caption).foregroundColor(.red).padding(.horizontal, 16)
                        }

                        Button(action: { showDeleteConfirm = true }) {
                            Text("Deactivate Account")
                                .font(.subheadline.bold())
                                .frame(maxWidth: .infinity)
                                .frame(height: 44)
                                .background(Color.red)
                                .foregroundColor(.white)
                                .cornerRadius(10)
                        }
                        .padding(.horizontal, 16)
                    }
                    .padding(.bottom, 24)
                }
            }
            .navigationTitle("Patient Detail")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Done") { dismiss() }
                        .foregroundColor(Color(hex: "1B4332"))
                }
            }
            .alert("Success", isPresented: $showSuccess) {
                Button("OK") {}
            } message: {
                Text(successMessage)
            }
            .alert("Deactivate Account", isPresented: $showDeleteConfirm) {
                Button("Deactivate", role: .destructive) { deleteAccount() }
                Button("Cancel", role: .cancel) {}
            } message: {
                Text("Are you sure you want to deactivate \(patient.name)'s account? This cannot be undone.")
            }
        }
    }

    private func saveButton(label: String) -> some View {
        Group {
            if isLoading {
                ProgressView().tint(.white)
            } else {
                Text(label).font(.subheadline.bold())
            }
        }
        .frame(maxWidth: .infinity)
        .frame(height: 44)
        .background(Color(hex: "B8860B"))
        .foregroundColor(.white)
        .cornerRadius(10)
    }

    private func updatePhase() {
        isLoading = true
        Task {
            do {
                try await APIClient.shared.updatePhase(patientId: patient.id, phase: selectedPhase)
                successMessage = "Phase updated successfully"
                showSuccess = true
            } catch {
                errorMessage = error.localizedDescription
                showError = true
            }
            isLoading = false
        }
    }

    private func assignMentor() {
        guard let mentorId = selectedMentorId else { return }
        isLoading = true
        Task {
            do {
                try await APIClient.shared.assignMentor(patientId: patient.id, mentorId: mentorId)
                successMessage = "Mentor assigned successfully"
                showSuccess = true
            } catch {
                errorMessage = error.localizedDescription
                showError = true
            }
            isLoading = false
        }
    }

    private func deleteAccount() {
        Task {
            do {
                try await APIClient.shared.deleteUser(userId: patient.id)
                dismiss()
            } catch {
                errorMessage = error.localizedDescription
                showError = true
            }
        }
    }
}
