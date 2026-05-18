import SwiftUI

struct AdminDashboardView: View {
    @EnvironmentObject var auth: AuthService
    @Environment(\.scenePhase) private var scenePhase
    @State private var overview: AdminOverview?
    @State private var isLoading = true
    @State private var showCreateUser = false
    @State private var createRole: String = "patient"
    @State private var selectedPatient: PatientSummary?
    @State private var selectedMentor: MentorSummary?
    @State private var errorMessage = ""
    @State private var showDeleteAlert = false
    @State private var pendingDeleteId: Int?
    @State private var pendingDeleteName: String = ""
    @State private var pendingDeleteMessage: String = ""

    private func isVisible(_ status: String) -> Bool {
        status == "active" || status == "pending"
    }

    var visiblePatients: [PatientSummary] {
        (overview?.patients ?? []).filter { isVisible($0.status) }
    }

    var visibleMentors: [MentorSummary] {
        (overview?.mentors ?? []).filter { isVisible($0.status) }
    }

    var visibleAdmins: [AdminSummary] {
        (overview?.admins ?? []).filter { isVisible($0.status) }
    }

    var unassignedPatients: [PatientSummary] {
        visiblePatients.filter { $0.mentorId == nil && $0.status == "active" }
    }

    var totalUsers: Int {
        visiblePatients.count + visibleMentors.count + visibleAdmins.count
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
                                statCard(value: "\(visiblePatients.count)", label: "Patients", color: Color(hex: "2E7D32"))
                                statCard(value: "\(visibleMentors.count)", label: "Mentors", color: Color(hex: "B8860B"))
                                statCard(value: "\(visibleAdmins.count)", label: "Admins", color: Color(hex: "5C35A0"))
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
                            if !visiblePatients.isEmpty {
                                sectionCard(title: "Patients", count: visiblePatients.count, accentColor: Color(hex: "2E7D32")) {
                                    ForEach(visiblePatients) { patient in
                                        patientRow(patient: patient)
                                            .onTapGesture { selectedPatient = patient }
                                        if patient.id != visiblePatients.last?.id {
                                            Divider().padding(.leading, 58)
                                        }
                                    }
                                }
                            }

                            // Mentors section
                            if !visibleMentors.isEmpty {
                                sectionCard(title: "Mentors", count: visibleMentors.count, accentColor: Color(hex: "B8860B")) {
                                    ForEach(visibleMentors) { mentor in
                                        mentorRow(mentor: mentor)
                                            .onTapGesture { selectedMentor = mentor }
                                        if mentor.id != visibleMentors.last?.id {
                                            Divider().padding(.leading, 58)
                                        }
                                    }
                                }
                            }

                            // Admins section
                            if !visibleAdmins.isEmpty {
                                sectionCard(title: "Admins", count: visibleAdmins.count, accentColor: Color(hex: "5C35A0")) {
                                    ForEach(visibleAdmins) { admin in
                                        adminRow(admin: admin)
                                        if admin.id != visibleAdmins.last?.id {
                                            Divider().padding(.leading, 58)
                                        }
                                    }
                                }
                            }
                        }
                        .padding(.bottom, 24)
                    }
                    .refreshable { await loadData() }
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
            .onChange(of: scenePhase) { _, newPhase in
                if newPhase == .active { Task { await loadData() } }
            }
            .alert("Delete User", isPresented: $showDeleteAlert) {
                Button("Delete", role: .destructive) {
                    if let id = pendingDeleteId { deleteUser(userId: id) }
                }
                Button("Cancel", role: .cancel) {}
            } message: {
                Text(pendingDeleteMessage)
            }
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

    private func deleteUser(userId: Int) {
        Task {
            do {
                try await APIClient.shared.deleteUser(userId: userId)
                await loadData()
            } catch {
                errorMessage = error.localizedDescription
            }
        }
    }

    // MARK: - Section Card

    private func sectionCard<Content: View>(title: String, count: Int, accentColor: Color, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack {
                Text(title)
                    .font(.headline)
                    .foregroundColor(Color(hex: "1B4332"))
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
            UserAvatar(
                name: patient.name,
                profileImageUrl: patient.profileImageUrl,
                size: 40,
                backgroundColor: patient.mentorId == nil ? Color.red.opacity(0.15) : Color(hex: "2E7D32").opacity(0.15),
                foregroundColor: patient.mentorId == nil ? .red : Color(hex: "2E7D32")
            )
            VStack(alignment: .leading, spacing: 2) {
                Text(patient.name)
                    .font(.subheadline.bold())
                if let phase = patient.phase {
                    Text(phase)
                        .font(.caption)
                        .foregroundColor(Color(hex: "666666"))
                        .lineLimit(1)
                }
                Text(mentorName(for: patient.mentorId))
                    .font(.caption)
                    .foregroundColor(patient.mentorId == nil ? .red : .secondary)
            }
            Spacer()
            statusBadge(status: patient.status, phoneVerified: patient.phoneVerified, mustChangePassword: patient.mustChangePassword)
            Image(systemName: "chevron.right")
                .font(.caption2)
                .foregroundColor(Color(hex: "666666"))
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
        .contextMenu {
            Button(role: .destructive) {
                pendingDeleteId = patient.id
                pendingDeleteName = patient.name
                pendingDeleteMessage = "Are you sure you want to delete \(patient.name)? This cannot be undone."
                showDeleteAlert = true
            } label: {
                Label("Delete", systemImage: "trash")
            }
        }
    }

    // MARK: - Mentor Row

    private func mentorRow(mentor: MentorSummary) -> some View {
        let onboarded = (mentor.phoneVerified ?? false) && !(mentor.mustChangePassword ?? true)
        return HStack(spacing: 14) {
            UserAvatar(
                name: mentor.name,
                profileImageUrl: mentor.profileImageUrl,
                size: 40,
                backgroundColor: Color(hex: "B8860B").opacity(0.15),
                foregroundColor: Color(hex: "B8860B")
            )
            VStack(alignment: .leading, spacing: 2) {
                Text(mentor.name)
                    .font(.subheadline.bold())
                Text(mentor.email)
                    .font(.caption)
                    .foregroundColor(Color(hex: "666666"))
            }
            Spacer()
            Image(systemName: onboarded ? "checkmark.circle.fill" : "clock.fill")
                .foregroundColor(onboarded ? .green : .orange)
                .font(.subheadline)
            statusBadge(status: mentor.status, phoneVerified: mentor.phoneVerified, mustChangePassword: mentor.mustChangePassword)
            Image(systemName: "chevron.right")
                .font(.caption2)
                .foregroundColor(Color(hex: "666666"))
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
        .contextMenu {
            Button(role: .destructive) {
                let assignedCount = visiblePatients.filter { $0.mentorId == mentor.id }.count
                pendingDeleteId = mentor.id
                pendingDeleteName = mentor.name
                pendingDeleteMessage = assignedCount > 0
                    ? "This mentor has \(assignedCount) active patient\(assignedCount == 1 ? "" : "s") who will be unassigned. Are you sure?"
                    : "Are you sure you want to delete \(mentor.name)? This cannot be undone."
                showDeleteAlert = true
            } label: {
                Label("Delete", systemImage: "trash")
            }
        }
    }

    // MARK: - Admin Row

    private func adminRow(admin: AdminSummary) -> some View {
        HStack(spacing: 14) {
            UserAvatar(
                name: admin.name,
                profileImageUrl: nil,
                size: 40,
                backgroundColor: Color(hex: "5C35A0").opacity(0.15),
                foregroundColor: Color(hex: "5C35A0")
            )
            VStack(alignment: .leading, spacing: 2) {
                Text(admin.name)
                    .font(.subheadline.bold())
                Text(admin.email)
                    .font(.caption)
                    .foregroundColor(Color(hex: "666666"))
            }
            Spacer()
            statusBadge(status: admin.status)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
    }

    // MARK: - Status Badge

    private func statusBadge(status: String, phoneVerified: Bool? = nil, mustChangePassword: Bool? = nil) -> some View {
        // Display-only override: onboarded users (phone verified + temp password replaced)
        // show as "Active" even if the DB still has them as "pending".
        let isOnboarded = (phoneVerified ?? false) && !(mustChangePassword ?? true)
        let effectiveStatus = (status == "pending" && isOnboarded) ? "active" : status
        let color: Color = effectiveStatus == "active" ? .green : effectiveStatus == "inactive" ? .red : .orange
        return Text(effectiveStatus.capitalized)
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
                .foregroundColor(Color(hex: "666666"))
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

    @State private var showDeleteConfirm = false
    @State private var errorMessage = ""
    @State private var showError = false

    var assignedPatients: [PatientSummary] {
        overview?.patients.filter { $0.mentorId == mentor.id } ?? []
    }

    var onboarded: Bool {
        (mentor.phoneVerified ?? false) && !(mentor.mustChangePassword ?? true)
    }

    var displayStatus: String {
        (mentor.status == "pending" && onboarded) ? "active" : mentor.status
    }

    var body: some View {
        NavigationStack {
            List {
                Section("Details") {
                    LabeledContent("Email", value: mentor.email)
                    LabeledContent("Username", value: mentor.username ?? "—")
                    LabeledContent("Status", value: displayStatus.capitalized)
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
                            .foregroundColor(Color(hex: "666666"))
                    } else {
                        ForEach(assignedPatients) { patient in
                            VStack(alignment: .leading, spacing: 2) {
                                Text(patient.name)
                                    .font(.subheadline.bold())
                                Text(patient.phase ?? "Pre-Consult & Decision")
                                    .font(.caption)
                                    .foregroundColor(Color(hex: "666666"))
                            }
                        }
                    }
                }
                Section {
                    Button("Delete Account") { showDeleteConfirm = true }
                        .font(.footnote)
                        .foregroundColor(.red)
                        .frame(maxWidth: .infinity, alignment: .center)
                        .listRowBackground(Color.clear)
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
            .alert("Delete Account", isPresented: $showDeleteConfirm) {
                Button("Delete", role: .destructive) { deleteAccount() }
                Button("Cancel", role: .cancel) {}
            } message: {
                Text("This will unassign all patients from this mentor. Are you sure?")
            }
            .alert("Error", isPresented: $showError) {
                Button("OK", role: .cancel) {}
            } message: {
                Text(errorMessage)
            }
        }
    }

    private func deleteAccount() {
        Task {
            do {
                try await APIClient.shared.deleteUser(userId: mentor.id)
                dismiss()
            } catch {
                errorMessage = error.localizedDescription
                showError = true
            }
        }
    }
}
