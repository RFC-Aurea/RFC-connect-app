import SwiftUI

struct MentorResourcesView: View {
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

    var body: some View {
        NavigationStack {
            ZStack {
                Color(hex: "F5F5F0").ignoresSafeArea()
                if isLoading {
                    ProgressView()
                } else {
                    ScrollView {
                        VStack(spacing: 20) {
                            headerCard
                            allPhasesSection
                        }
                        .padding(.bottom, 24)
                    }
                }
            }
            .navigationTitle("Resources")
            .navigationBarTitleDisplayMode(.large)
            .task { await loadResources() }
        }
    }

    private var headerCard: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("Patient Resource Library")
                .font(.headline)
                .foregroundColor(Color(hex: "1B4332"))
            Text("Reference materials your patients can access")
                .font(.subheadline)
                .foregroundColor(Color(hex: "666666"))
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(16)
        .background(Color.white)
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.05), radius: 4, y: 2)
        .padding(.horizontal, 16)
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

        return VStack(spacing: 0) {
            Button(action: {
                withAnimation(.easeInOut(duration: 0.2)) {
                    expandedPhase = isExpanded ? nil : phase
                }
            }) {
                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(phase)
                            .font(.subheadline.bold())
                            .foregroundColor(Color(hex: "1B4332"))
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
                .background(Color.white)
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
