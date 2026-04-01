import Foundation

struct Message: Codable, Identifiable, Equatable {
    let id: Int
    let senderId: Int
    let receiverId: Int
    let content: String
    let messageType: String
    let createdAt: String
    let attachment: ChatAttachment?
    var isFlagged: Bool?
}

struct ChatAttachment: Codable, Identifiable, Equatable {
    let id: Int
    let type: String
    let url: String
    let fileName: String?
    let fileSize: Int?
    let durationSeconds: Int?
}
