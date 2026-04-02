import SwiftUI

struct PatientDashboardView: View {
    @EnvironmentObject var auth: AuthService
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

                            // Journey Hub quick access
                            if let resources = dashboard?.resources, !resources.isEmpty {
                                journeyQuickAccess(resources: Array(resources.prefix(2)))
                            }
                        }
                        .padding(.bottom, 24)
                    }
                }
            }
            .navigationTitle("My Dashboard")
            .navigationBarTitleDisplayMode(.large)
            .task { await loadData() }
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
                Circle()
                    .fill(Color(hex: "1B4332").opacity(0.15))
                    .frame(width: 52, height: 52)
                    .overlay(
                        Text(mentor.name.prefix(1).uppercased())
                            .font(.title3.bold())
                            .foregroundColor(Color(hex: "1B4332"))
                    )

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

    private func journeyQuickAccess(resources: [Resource]) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Journey Hub")
                .font(.headline)
                .padding(.horizontal, 16)

            ForEach(resources) { resource in
                NavigationLink(destination: ResourceDetailView(resource: resource)) {
                    resourceCard(resource: resource)
                }
            }
        }
    }

    private func resourceCard(resource: Resource) -> some View {
        HStack(spacing: 14) {
            Image(systemName: resourceIcon(resource.type))
                .font(.title3)
                .foregroundColor(Color(hex: "1B4332"))
                .frame(width: 40, height: 40)
                .background(Color(hex: "1B4332").opacity(0.1))
                .cornerRadius(10)

            VStack(alignment: .leading, spacing: 3) {
                Text(resource.title)
                    .font(.subheadline.bold())
                    .foregroundColor(Color(hex: "1B4332"))
                Text(resource.summary)
                    .font(.caption)
                    .foregroundColor(Color(hex: "666666"))
                    .lineLimit(2)
                if let readTime = resource.readTime {
                    Text(readTime)
                        .font(.caption2)
                        .foregroundColor(Color(hex: "B8860B"))
                }
            }
            Spacer()
            Image(systemName: "chevron.right")
                .font(.caption)
                .foregroundColor(Color(hex: "666666"))
        }
        .padding(16)
        .background(Color.white)
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.05), radius: 4, y: 2)
        .padding(.horizontal, 16)
    }

    private func resourceIcon(_ type: String) -> String {
        switch type.lowercased() {
        case "video": return "play.circle.fill"
        case "article": return "doc.text.fill"
        case "audio": return "waveform"
        case "tip": return "lightbulb.fill"
        default: return "book.fill"
        }
    }

    private func loadData() async {
        isLoading = true
        do {
            dashboard = try await APIClient.shared.getPatientDashboard()
        } catch {}
        isLoading = false
    }
}
