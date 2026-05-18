import SwiftUI

struct PatientDashboardView: View {
    @EnvironmentObject var auth: AuthService
    @Environment(\.scenePhase) private var scenePhase
    @State private var dashboard: APIClient.PatientDashboard?
    @State private var isLoading = true
    @State private var selectedMentorForChat: MentorSummary?
    @State private var navigateToChat = false

    private let phases = [
        "Pre-Consult & Decision", "Testing & Diagnosis", "Stimulation",
        "Retrieval & Fertilization", "Transfer Prep", "Two Week Wait",
        "Early Pregnancy", "Postpartum/Graduation"
    ]

    var phaseProgress: Double {
        guard let phase = dashboard?.phase ?? dashboard?.user.phase ?? auth.currentUser?.phase,
              let idx = phases.firstIndex(of: phase) else { return 0 }
        return Double(idx + 1) / Double(phases.count)
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
                            // Welcome + Phase card
                            phaseCard

                            // Mentor card
                            if let mentor = dashboard?.mentor {
                                mentorCard(mentor: mentor)
                            } else {
                                noMentorCard
                            }
                        }
                        .padding(.bottom, 24)
                    }
                    .refreshable { await loadData() }
                }
            }
            .navigationTitle("My Dashboard")
            .navigationBarTitleDisplayMode(.large)
            .task { await loadData() }
            .onChange(of: scenePhase) { _, newPhase in
                if newPhase == .active { Task { await loadData() } }
            }
            .navigationDestination(isPresented: $navigateToChat) {
                if let mentor = selectedMentorForChat {
                    ChatView(partnerId: mentor.id, partnerName: mentor.name)
                }
            }
        }
    }

    private var phaseCard: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Welcome back,")
                        .font(.subheadline)
                        .foregroundColor(Color(hex: "666666"))
                    Text(auth.currentUser?.name ?? "")
                        .font(.title2.bold())
                        .foregroundColor(Color(hex: "1B4332"))
                }
                Spacer()
                Image(systemName: "heart.fill")
                    .font(.title2)
                    .foregroundColor(Color(hex: "B8860B"))
            }

            if let phase = dashboard?.phase ?? dashboard?.user.phase ?? auth.currentUser?.phase {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Current Phase")
                        .font(.caption.bold())
                        .foregroundColor(Color(hex: "666666"))
                    Text(phase)
                        .font(.subheadline.bold())
                        .foregroundColor(Color(hex: "1B4332"))
                    ProgressView(value: phaseProgress)
                        .tint(Color(hex: "B8860B"))
                    HStack {
                        Text("Phase \(Int(phaseProgress * Double(phases.count))) of \(phases.count)")
                            .font(.caption)
                            .foregroundColor(Color(hex: "666666"))
                        Spacer()
                        Text("\(Int(phaseProgress * 100))%")
                            .font(.caption.bold())
                            .foregroundColor(Color(hex: "B8860B"))
                    }
                }
            } else {
                Text("Your clinic will set your phase soon")
                    .font(.subheadline)
                    .foregroundColor(Color(hex: "666666"))
            }
        }
        .padding(20)
        .background(Color.white)
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.05), radius: 4, y: 2)
        .padding(.horizontal, 16)
    }

    private func mentorCard(mentor: MentorSummary) -> some View {
        VStack(alignment: .leading, spacing: 14) {
            Text("Your Mentor")
                .font(.caption.bold())
                .foregroundColor(Color(hex: "666666"))

            HStack(spacing: 14) {
                UserAvatar(name: mentor.name, profileImageUrl: mentor.profileImageUrl, size: 52)

                VStack(alignment: .leading, spacing: 3) {
                    Text(mentor.name).font(.headline)
                    Text("RFC Peer Mentor").font(.caption).foregroundColor(Color(hex: "666666"))
                }
                Spacer()
            }

            Button(action: {
                selectedMentorForChat = mentor
                navigateToChat = true
            }) {
                HStack {
                    Image(systemName: "message.fill")
                    Text("Message")
                        .font(.subheadline.bold())
                    if let unread = dashboard?.unreadCount, unread > 0 {
                        Text("\(unread)")
                            .font(.caption2.bold())
                            .foregroundColor(.red)
                            .padding(.horizontal, 7)
                            .padding(.vertical, 2)
                            .background(Color.white)
                            .clipShape(Capsule())
                    }
                }
                .frame(maxWidth: .infinity)
                .frame(height: 44)
                .background(Color(hex: "1B4332"))
                .foregroundColor(.white)
                .cornerRadius(10)
            }
        }
        .padding(20)
        .background(Color.white)
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.05), radius: 4, y: 2)
        .padding(.horizontal, 16)
    }

    private var noMentorCard: some View {
        HStack(spacing: 14) {
            Image(systemName: "clock.fill")
                .font(.title2)
                .foregroundColor(Color(hex: "B8860B"))
            VStack(alignment: .leading, spacing: 3) {
                Text("Mentor Pending")
                    .font(.subheadline.bold())
                Text("Your clinic will assign a mentor soon")
                    .font(.caption)
                    .foregroundColor(Color(hex: "666666"))
            }
        }
        .padding(20)
        .background(Color(hex: "B8860B").opacity(0.1))
        .cornerRadius(16)
        .padding(.horizontal, 16)
    }

    private func loadData() async {
        isLoading = true
        do {
            dashboard = try await APIClient.shared.getPatientDashboard()
        } catch {}
        isLoading = false
    }
}
