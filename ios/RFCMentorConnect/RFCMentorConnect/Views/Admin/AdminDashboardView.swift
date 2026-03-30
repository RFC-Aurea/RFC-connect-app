import SwiftUI

struct AdminDashboardView: View {
    @EnvironmentObject var auth: AuthService
    @State private var overview: AdminOverview?
    @State private var isLoading = true
    @State private var showCreateUser = false
    @State private var createRole: String = "patient"
    @State private var selectedPatient: PatientSummary?
    @State private var selectedMentor: MentorSummary?
    @State private var errorMessage = ""

    var unassignedPatients: [PatientSummary] {
        overview?.patients.filter { $0.mentorId == nil } ?? []
    }

    var totalUsers: Int {
        (overview?.patients.count ?? 0) + (overview?.mentors.count ?? 0) + (overview?.admins?.count ?? 0)
    }

    func mentorName(for mentorId: Int?) -> String {
        guard let mentorId else { return "Unassigned" }
        return overview?.mentors.first(where: { $0.id == mentorId })?.name ?? "Unassigned"
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
                            HStack(spacing: 10) {
                                actionButton(title: "Add Mentor", icon: "person.badge.plus") {
                                    createRole = "mentor"
                                    showCreateUser = true
                                }
                                actionButton(title: "Add Patient", icon: "heart.text.square") {
                                    createRole = "patient"
                                    showCreateUser = true
                                }
                                actionButton(title: "Add Admin", icon: "shield.lefthalf.filled") {
                                    createRole = "admin"
                                    showCreateUser = true
                                }
                            }
                            .padding(.horizontal, 16)

                            // Stats row
                            HStack(spacing: 10) {
                                statCard(value: "\(totalUsers)", label: "Total", color: Color(hex: "1B4332"))
                                statCard(value: "\(overview?.patients.count ?? 0)", label: "Patients", color: Color(hex: "2E7D32"))
                                statCard(value: "\(overview?.mentors.count ?? 0)", label: "Mentors", color: Color(hex: "B8860B"))
                                statCard(value: "\(overview?.admins?.count ?? 0)", label: "Admins", color: Color(hex: "5C35A0"))
                            }
                            .padding(.horizontal, 16)

                            // Needs Assignment (prominent)
                            if !unassignedPatients.isEmpty {
                                sectionCard(title: "Needs Assignment", count: unassignedPatients.count, accentColor: .red) {
                                    ForEach(unassignedPatients) { patient in
                                        patientRow(patient: patient)
                                            .onTapGesture { selectedPatient = patient }
                                        if patient.id != unassignedPatients.last?.id {
                                            Divider().padding(.leading, 58)
                                        }
                                    }
                                }
                            }

                            // Patients section
                            if let patients = overview?.patients, !patients.isEmpty {
                                sectionCard(title: "Patients", count: patients.count, accentColor: Color(hex: "2E7D32")) {
                                    ForEach(patients) { patient in
                                        patientRow(patient: patient)
                                            .onTapGesture { selectedPatient = patient }
                                        if patient.id != patients.last?.id {
                                            Divider().padding(.leading, 58)
                                        }
                                    }
                                }
                            }

                            // Mentors section
                            if let mentors = overview?.mentors, !mentors.isEmpty {
                                sectionCard(title: "Mentors", count: mentors.count, accentColor: Color(hex: "B8860B")) {
                                    ForEach(mentors) { mentor in
                                        mentorRow(mentor: mentor)
                                            .onTapGesture { selectedMentor = mentor }
                                        if mentor.id != mentors.last?.id {
                                            Divider().padding(.leading, 58)
                                        }
                                    }
                                }
                            }

                            // Admins section
                            if let admins = overview?.admins, !admins.isEmpty {
                                sectionCard(title: "Admins", count: admins.count, accentColor: Color(hex: "5C35A0")) {
                                    ForEach(admins) { admin in
                                        adminRow(admin: admin)
                                        if admin.id != admins.last?.id {
                                            Divider().padding(.leading, 58)
                                        }
                                    }
                                }
                            }
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
            .sheet(item: $selectedMentor) { mentor in
                MentorDetailView(mentor: mentor, overview: overview)
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

    // MARK: - Section Card

    private func sectionCard<Content: View>(title: String, count: Int, accentColor: Color, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack {
                Text(title)
                    .font(.headline)
                    .foregroundColor(.primary)
                Spacer()
                Text("\(count)")
                    .font(.caption.bold())
                    .padding(.horizontal, 8)
                    .padding(.vertical, 3)
                    .background(accentColor.opacity(0.15))
                    .foregroundColor(accentColor)
                    .cornerRadius(8)
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
            .background(accentColor.opacity(0.06))

            VStack(spacing: 0) {
                content()
            }
        }
        .background(Color.white)
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.05), radius: 4, y: 2)
        .padding(.horizontal, 16)
    }

    // MARK: - Patient Row

    private func patientRow(patient: PatientSummary) -> some View {
        HStack(spacing: 14) {
            Circle()
                .fill(patient.mentorId == nil ? Color.red.opacity(0.15) : Color(hex: "2E7D32").opacity(0.15))
                .frame(width: 40, height: 40)
                .overlay(
                    Text(patient.name.prefix(1).uppercased())
                        .font(.subheadline.bold())
                        .foregroundColor(patient.mentorId == nil ? .red : Color(hex: "2E7D32"))
                )
            VStack(alignment: .leading, spacing: 2) {
                Text(patient.name)
                    .font(.subheadline.bold())
                if let phase = patient.phase {
                    Text(phase)
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .lineLimit(1)
                }
                Text(mentorName(for: patient.mentorId))
                    .font(.caption)
                    .foregroundColor(patient.mentorId == nil ? .red : .secondary)
            }
            Spacer()
            statusBadge(status: patient.status)
            Image(systemName: "chevron.right")
                .font(.caption2)
                .foregroundColor(.secondary)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
    }

    // MARK: - Mentor Row

    private func mentorRow(mentor: MentorSummary) -> some View {
        let onboarded = (mentor.phoneVerified ?? false) && !(mentor.mustChangePassword ?? true)
        return HStack(spacing: 14) {
            Circle()
                .fill(Color(hex: "B8860B").opacity(0.15))
                .frame(width: 40, height: 40)
                .overlay(
                    Text(mentor.name.prefix(1).uppercased())
                        .font(.subheadline.bold())
                        .foregroundColor(Color(hex: "B8860B"))
                )
            VStack(alignment: .leading, spacing: 2) {
                Text(mentor.name)
                    .font(.subheadline.bold())
                Text(mentor.email)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            Spacer()
            Image(systemName: onboarded ? "checkmark.circle.fill" : "clock.fill")
                .foregroundColor(onboarded ? .green : .orange)
                .font(.subheadline)
            statusBadge(status: mentor.status)
            Image(systemName: "chevron.right")
                .font(.caption2)
                .foregroundColor(.secondary)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
    }

    // MARK: - Admin Row

    private func adminRow(admin: AdminSummary) -> some View {
        HStack(spacing: 14) {
            Circle()
                .fill(Color(hex: "5C35A0").opacity(0.15))
                .frame(width: 40, height: 40)
                .overlay(
                    Text(admin.name.prefix(1).uppercased())
                        .font(.subheadline.bold())
                        .foregroundColor(Color(hex: "5C35A0"))
                )
            VStack(alignment: .leading, spacing: 2) {
                Text(admin.name)
                    .font(.subheadline.bold())
                Text(admin.email)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            Spacer()
            statusBadge(status: admin.status)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
    }

    // MARK: - Status Badge

    private func statusBadge(status: String) -> some View {
        let color: Color = status == "active" ? .green : status == "inactive" ? .red : .orange
        return Text(status.capitalized)
            .font(.caption2.bold())
            .padding(.horizontal, 6)
            .padding(.vertical, 3)
            .background(color.opacity(0.15))
            .foregroundColor(color)
            .cornerRadius(6)
    }

    // MARK: - Action Button

    private func actionButton(title: String, icon: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack(spacing: 6) {
                Image(systemName: icon)
                    .font(.caption)
                Text(title)
                    .font(.caption.bold())
            }
            .frame(maxWidth: .infinity)
            .frame(height: 44)
            .background(Color(hex: "1B4332"))
            .foregroundColor(.white)
            .cornerRadius(12)
        }
    }

    // MARK: - Stat Card

    private func statCard(value: String, label: String, color: Color) -> some View {
        VStack(spacing: 4) {
            Text(value)
                .font(.title2.bold())
                .foregroundColor(color)
            Text(label)
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 12)
        .background(Color.white)
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.05), radius: 4, y: 2)
    }
}

// MARK: - Mentor Detail Sheet

struct MentorDetailView: View {
    let mentor: MentorSummary
    let overview: AdminOverview?
    @Environment(\.dismiss) var dismiss

    var assignedPatients: [PatientSummary] {
        overview?.patients.filter { $0.mentorId == mentor.id } ?? []
    }

    var onboarded: Bool {
        (mentor.phoneVerified ?? false) && !(mentor.mustChangePassword ?? true)
    }

    var body: some View {
        NavigationStack {
            List {
                Section("Details") {
                    LabeledContent("Email", value: mentor.email)
                    LabeledContent("Username", value: mentor.username ?? "—")
                    LabeledContent("Status", value: mentor.status.capitalized)
                    LabeledContent("Onboarding") {
                        Label(
                            onboarded ? "Complete" : "Pending",
                            systemImage: onboarded ? "checkmark.circle.fill" : "clock.fill"
                        )
                        .foregroundColor(onboarded ? .green : .orange)
                    }
                }
                Section("Assigned Patients (\(assignedPatients.count))") {
                    if assignedPatients.isEmpty {
                        Text("No patients assigned")
                            .foregroundColor(.secondary)
                    } else {
                        ForEach(assignedPatients) { patient in
                            VStack(alignment: .leading, spacing: 2) {
                                Text(patient.name)
                                    .font(.subheadline.bold())
                                Text(patient.phase ?? "Pre-Consult & Decision")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }
                        }
                    }
                }
            }
            .navigationTitle(mentor.name)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") { dismiss() }
                        .foregroundColor(Color(hex: "1B4332"))
                }
            }
        }
    }
}
