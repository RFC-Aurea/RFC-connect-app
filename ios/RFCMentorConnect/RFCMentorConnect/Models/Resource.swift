import Foundation

struct Resource: Codable, Identifiable {
    let id: Int
    let title: String
    let phase: String
    let category: String
    let type: String
    let summary: String
    let content: String?
    let readTime: String?
    let createdBy: Int?
    let createdAt: String?
}
