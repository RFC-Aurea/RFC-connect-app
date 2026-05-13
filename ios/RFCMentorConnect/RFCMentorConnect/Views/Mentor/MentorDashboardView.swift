import SwiftUI

struct MentorDashboardView: View {
    @EnvironmentObject var auth: AuthService
    @Environment(\.scenePhase) private var scenePhase
    @State private var mentees: [PatientSummary] = []
    @State private var isLoading = true

    var body: some View {
        NavigationStack {
            ZStack {
                Color(hex: "F5F5F0").ignoresSafeArea()
                if isLoading {
                    ProgressView()
                } else {
                    ScrollView {
                        VStack(spacing: 20) {
                            // Stats
                            HStack(spacing: 12) {
                                statCard(value: "\(mentees.count)", label: "Active Mentees", icon: "person.2.fill", color: Color(hex: "1B4332"))
                            }
                            .padding(.horizontal, 16)

                            // Guidelines card
                            guidelinesCard

                            // Mentees list
                            if mentees.isEmpty {
                                emptyState
                            } else {
                                menteesSection
                            }
                        }
                        .padding(.bottom, 24)
                    }
                    .refreshable { await loadData() }
                }
            }
            .navigationTitle("Mentor Dashboard")
            .navigationBarTitleDisplayMode(.large)
            .task { await loadData() }
            .onChange(of: scenePhase) { _, newPhase in
                if newPhase == .active { Task { await loadData() } }
            }
        }
    }

    private var guidelinesCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 10) {
                Image(systemName: "heart.text.square.fill")
                    .font(.title3)
                    .foregroundColor(Color(hex: "B8860B"))
                Text("Mentor Guidelines")
                    .font(.headline)
                    .foregroundColor(Color(hex: "1B4332"))
            }
            Text("Remember: you provide peer support only. Always refer medical questions to the RFC clinical team. Respond to messages within 48 hours when possible.")
                .font(.caption)
                .foregroundColor(Color(hex: "666666"))
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding(20)
        .background(Color(hex: "B8860B").opacity(0.08))
        .cornerRadius(16)
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(Color(hex: "B8860B").opacity(0.3), lineWidth: 1)
        )
        .padding(.horizontal, 16)
    }

    private var menteesSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Your Mentees")
                .font(.headline)
                .padding(.horizontal, 16)

            ForEach(mentees) { mentee in
                NavigationLink(destination: ChatView(partnerId: mentee.id, partnerName: mentee.name)) {
                    menteeCard(mentee: mentee)
                }
            }
        }
    }

    private func menteeCard(mentee: PatientSummary) -> some View {
        HStack(spacing: 14) {
            Circle()
                .fill(Color(hex: "1B4332").opacity(0.15))
                .frame(width: 48, height: 48)
                .overlay(
                    Text(mentee.name.prefix(1).uppercased())
                        .font(.headline.bold())
                        .foregroundColor(Color(hex: "1B4332"))
                )

            VStack(alignment: .leading, spacing: 3) {
                Text(mentee.name)
                    .font(.subheadline.bold())
                    .foregroundColor(Color(hex: "1B4332"))
                if let phase = mentee.phase {
                    Text(phase)
                        .font(.caption)
                        .foregroundColor(Color(hex: "666666"))
                }
            }
            Spacer()
            Image(systemName: "message.fill")
                .foregroundColor(Color(hex: "1B4332"))
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

    private var emptyState: some View {
        VStack(spacing: 12) {
            Image(systemName: "person.2.slash")
                .font(.system(size: 48))
                .foregroundColor(Color(hex: "666666"))
            Text("No Mentees Yet")
                .font(.headline)
            Text("Patients will appear here once the admin assigns them to you.")
                .font(.subheadline)
                .foregroundColor(Color(hex: "666666"))
                .multilineTextAlignment(.center)
        }
        .padding(40)
    }

    private func statCard(value: String, label: String, icon: String, color: Color) -> some View {
        HStack(spacing: 14) {
            Image(systemName: icon)
                .font(.title2)
                .foregroundColor(color)
                .frame(width: 48, height: 48)
                .background(color.opacity(0.1))
                .cornerRadius(12)
            VStack(alignment: .leading, spacing: 2) {
                Text(value)
                    .font(.title.bold())
                    .foregroundColor(color)
                Text(label)
                    .font(.caption)
                    .foregroundColor(Color(hex: "666666"))
            }
            Spacer()
        }
        .padding(16)
        .background(Color.white)
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.05), radius: 4, y: 2)
    }

    private func loadData() async {
        isLoading = true
        do {
            mentees = try await APIClient.shared.getMentorMentees()
        } catch {}
        isLoading = false
    }
}
