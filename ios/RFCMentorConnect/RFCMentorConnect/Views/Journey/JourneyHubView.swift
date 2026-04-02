import SwiftUI

struct JourneyHubView: View {
    @EnvironmentObject var auth: AuthService
    @State private var resources: [Resource] = []
    @State private var isLoading = true
    @State private var expandedPhase: String?

    private let phases = [
        "Pre-Consult & Decision", "Testing & Diagnosis", "Stimulation",
        "Retrieval & Fertilization", "Transfer Prep", "Two Week Wait",
        "Early Pregnancy", "Postpartum/Graduation"
    ]

    private func resources(for phase: String) -> [Resource] {
        resources.filter { $0.phase == phase }
    }

    var currentPhase: String? {
        auth.currentUser?.phase
    }

    var currentPhaseResources: [Resource] {
        guard let phase = currentPhase else { return [] }
        return resources(for: phase)
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
                            // Current phase resources
                            if let phase = currentPhase, !currentPhaseResources.isEmpty {
                                currentPhaseSection(phase: phase)
                            }

                            // All phases
                            allPhasesSection
                        }
                        .padding(.bottom, 24)
                    }
                }
            }
            .navigationTitle("Journey Hub")
            .navigationBarTitleDisplayMode(.large)
            .task { await loadResources() }
        }
    }

    private func currentPhaseSection(phase: String) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: "star.fill")
                    .foregroundColor(Color(hex: "B8860B"))
                Text("Your Phase: \(phase)")
                    .font(.headline)
                    .foregroundColor(Color(hex: "1B4332"))
            }
            .padding(.horizontal, 16)

            ForEach(currentPhaseResources) { resource in
                NavigationLink(destination: ResourceDetailView(resource: resource)) {
                    resourceCard(resource: resource)
                }
            }
        }
    }

    private var allPhasesSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("All Phases")
                .font(.headline)
                .padding(.horizontal, 16)

            ForEach(phases, id: \.self) { phase in
                phaseAccordion(phase: phase)
            }
        }
    }

    private func phaseAccordion(phase: String) -> some View {
        let phaseResources = resources(for: phase)
        let isExpanded = expandedPhase == phase
        let isCurrent = currentPhase == phase

        return VStack(spacing: 0) {
            Button(action: {
                withAnimation(.easeInOut(duration: 0.2)) {
                    expandedPhase = isExpanded ? nil : phase
                }
            }) {
                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        HStack(spacing: 6) {
                            if isCurrent {
                                Image(systemName: "location.fill")
                                    .font(.caption)
                                    .foregroundColor(Color(hex: "B8860B"))
                            }
                            Text(phase)
                                .font(.subheadline.bold())
                                .foregroundColor(Color(hex: "1B4332"))
                        }
                        Text("\(phaseResources.count) resource\(phaseResources.count == 1 ? "" : "s")")
                            .font(.caption)
                            .foregroundColor(Color(hex: "666666"))
                    }
                    Spacer()
                    Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
                        .font(.caption)
                        .foregroundColor(Color(hex: "666666"))
                }
                .padding(16)
                .background(isCurrent ? Color(hex: "1B4332").opacity(0.05) : Color.white)
            }
            .buttonStyle(.plain)

            if isExpanded {
                VStack(spacing: 0) {
                    Divider()
                    ForEach(phaseResources) { resource in
                        NavigationLink(destination: ResourceDetailView(resource: resource)) {
                            HStack(spacing: 12) {
                                Image(systemName: resourceIcon(resource.type))
                                    .foregroundColor(Color(hex: "1B4332"))
                                    .frame(width: 28)
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(resource.title)
                                        .font(.subheadline)
                                        .foregroundColor(Color(hex: "1B4332"))
                                    if let readTime = resource.readTime {
                                        Text(readTime)
                                            .font(.caption)
                                            .foregroundColor(Color(hex: "666666"))
                                    }
                                }
                                Spacer()
                                Image(systemName: "chevron.right")
                                    .font(.caption2)
                                    .foregroundColor(Color(hex: "666666"))
                            }
                            .padding(.horizontal, 16)
                            .padding(.vertical, 12)
                        }
                        .buttonStyle(.plain)
                        if resource.id != phaseResources.last?.id {
                            Divider().padding(.leading, 56)
                        }
                    }
                }
            }
        }
        .background(Color.white)
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.05), radius: 4, y: 2)
        .padding(.horizontal, 16)
    }

    private func resourceCard(resource: Resource) -> some View {
        HStack(spacing: 14) {
            Image(systemName: resourceIcon(resource.type))
                .font(.title3)
                .foregroundColor(Color(hex: "1B4332"))
                .frame(width: 44, height: 44)
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

    private func loadResources() async {
        isLoading = true
        do {
            resources = try await APIClient.shared.getResources()
        } catch { print("Failed to load resources: \(error)") }
        isLoading = false
    }
}
