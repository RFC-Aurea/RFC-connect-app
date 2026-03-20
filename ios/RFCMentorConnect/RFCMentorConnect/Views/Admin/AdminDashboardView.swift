import SwiftUI

struct AdminDashboardView: View {
    @EnvironmentObject var auth: AuthService
    @State private var overview: AdminOverview?
    @State private var isLoading = true
    @State private var showCreateUser = false
    @State private var createRole: String = "patient"
    @State private var selectedPatient: PatientSummary?
    @State private var errorMessage = ""

    var unassignedPatients: [PatientSummary] {
        overview?.patients.filter { $0.mentorId == nil } ?? []
    }

    var assignedPatients: [PatientSummary] {
        overview?.patients.filter { $0.mentorId != nil } ?? []
    }

    var body: some View {
        NavigationStack {
            ZStack {
                Color(hex: "F5F5F0").ignoresSafeArea()
                if isLoading {
                    ProgressView()
                } else {
                    ScrollView {
                        VStack(spacing: 20) {
                            // Action buttons
                            HStack(spacing: 12) {
                                actionButton(title: "Add New Mentor", icon: "person.badge.plus") {
                                    createRole = "mentor"
                                    showCreateUser = true
                                }
                                actionButton(title: "Add New Patient", icon: "heart.text.square") {
                                    createRole = "patient"
                                    showCreateUser = true
                                }
                            }
                            .padding(.horizontal, 16)

                            // Stats
                            HStack(spacing: 12) {
                                statCard(value: "\(overview?.patients.count ?? 0)", label: "Patients", color: Color(hex: "1B4332"))
                                statCard(value: "\(overview?.mentors.count ?? 0)", label: "Mentors", color: Color(hex: "B8860B"))
                                statCard(value: "\(unassignedPatients.count)", label: "Unassigned", color: .red)
                            }
                            .padding(.horizontal, 16)

                            // Needs Assignment
                            if !unassignedPatients.isEmpty {
                                patientSection(title: "Needs Assignment", patients: unassignedPatients, accent: .red)
                            }

                            // Assigned Patients
                            patientSection(title: "Assigned", patients: assignedPatients, accent: Color(hex: "1B4332"))
                        }
                        .padding(.bottom, 24)
                    }
                }
            }
            .navigationTitle("Admin Dashboard")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: { Task { await loadData() } }) {
                        Image(systemName: "arrow.clockwise")
                    }
                    .foregroundColor(Color(hex: "1B4332"))
                }
            }
            .sheet(isPresented: $showCreateUser, onDismiss: { Task { await loadData() } }) {
                CreateUserView(initialRole: createRole)
            }
            .sheet(item: $selectedPatient) { patient in
                PatientDetailView(patient: patient, overview: overview)
                    .onDisappear { Task { await loadData() } }
            }
            .task { await loadData() }
        }
    }

    private func loadData() async {
        isLoading = true
        do {
            overview = try await APIClient.shared.getAdminOverview()
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }

    private func patientSection(title: String, patients: [PatientSummary], accent: Color) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text(title)
                    .font(.headline)
                    .foregroundColor(.primary)
                Spacer()
                Text("\(patients.count)")
                    .font(.caption.bold())
                    .foregroundColor(accent)
            }
            .padding(.horizontal, 16)

            ForEach(patients) { patient in
                patientCard(patient: patient, accent: accent)
                    .onTapGesture { selectedPatient = patient }
            }
        }
    }

    private func patientCard(patient: PatientSummary, accent: Color) -> some View {
        HStack(spacing: 14) {
            Circle()
                .fill(accent.opacity(0.15))
                .frame(width: 44, height: 44)
                .overlay(
                    Text(patient.name.prefix(1).uppercased())
                        .font(.headline.bold())
                        .foregroundColor(accent)
                )

            VStack(alignment: .leading, spacing: 3) {
                Text(patient.name)
                    .font(.subheadline.bold())
                HStack(spacing: 6) {
                    if let phase = patient.phase {
                        Label(phase, systemImage: "circle.fill")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    if patient.mentorId != nil {
                        Label("Assigned", systemImage: "checkmark.circle.fill")
                            .font(.caption)
                            .foregroundColor(.green)
                    } else {
                        Label("Unassigned", systemImage: "exclamationmark.circle.fill")
                            .font(.caption)
                            .foregroundColor(.red)
                    }
                }
            }
            Spacer()
            Image(systemName: "chevron.right")
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .padding(16)
        .background(Color.white)
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.05), radius: 4, y: 2)
        .padding(.horizontal, 16)
    }

    private func actionButton(title: String, icon: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack(spacing: 8) {
                Image(systemName: icon)
                    .font(.subheadline)
                Text(title)
                    .font(.subheadline.bold())
            }
            .frame(maxWidth: .infinity)
            .frame(height: 50)
            .background(Color(hex: "1B4332"))
            .foregroundColor(.white)
            .cornerRadius(12)
        }
    }

    private func statCard(value: String, label: String, color: Color) -> some View {
        VStack(spacing: 4) {
            Text(value)
                .font(.title.bold())
                .foregroundColor(color)
            Text(label)
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 16)
        .background(Color.white)
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.05), radius: 4, y: 2)
    }
}
