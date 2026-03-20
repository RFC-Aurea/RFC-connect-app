import SwiftUI

struct ResourceDetailView: View {
    let resource: Resource

    var body: some View {
        ZStack {
            Color(hex: "F5F5F0").ignoresSafeArea()
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    // Header card
                    VStack(alignment: .leading, spacing: 12) {
                        HStack(spacing: 10) {
                            Image(systemName: resourceIcon(resource.type))
                                .font(.title2)
                                .foregroundColor(Color(hex: "1B4332"))
                                .frame(width: 48, height: 48)
                                .background(Color(hex: "1B4332").opacity(0.1))
                                .cornerRadius(12)

                            VStack(alignment: .leading, spacing: 3) {
                                Text(resource.category)
                                    .font(.caption.bold())
                                    .foregroundColor(Color(hex: "B8860B"))
                                    .textCase(.uppercase)
                                Text(resource.phase)
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }
                        }

                        Text(resource.title)
                            .font(.title2.bold())
                            .foregroundColor(Color(hex: "1B4332"))

                        Text(resource.summary)
                            .font(.subheadline)
                            .foregroundColor(.secondary)

                        if let readTime = resource.readTime {
                            Label(readTime, systemImage: "clock")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    }
                    .padding(20)
                    .background(Color.white)
                    .cornerRadius(16)
                    .shadow(color: .black.opacity(0.05), radius: 4, y: 2)

                    // Content
                    if let content = resource.content, !content.isEmpty {
                        VStack(alignment: .leading, spacing: 8) {
                            Text(content)
                                .font(.body)
                                .foregroundColor(.primary)
                                .fixedSize(horizontal: false, vertical: true)
                        }
                        .padding(20)
                        .background(Color.white)
                        .cornerRadius(16)
                        .shadow(color: .black.opacity(0.05), radius: 4, y: 2)
                    }

                    // Disclaimer
                    HStack(spacing: 8) {
                        Image(systemName: "info.circle")
                            .foregroundColor(.secondary)
                        Text("This content is for informational purposes only. Always consult your RFC medical team for personalized guidance.")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    .padding(12)
                    .background(Color.gray.opacity(0.08))
                    .cornerRadius(10)
                }
                .padding(16)
                .padding(.bottom, 24)
            }
        }
        .navigationTitle(resource.title)
        .navigationBarTitleDisplayMode(.inline)
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
}
