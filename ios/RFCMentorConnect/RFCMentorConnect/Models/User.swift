import Foundation

struct User: Codable, Identifiable {
    let id: Int
    let name: String
    let email: String
    let role: UserRole
    let status: String
    let username: String?
    let phone: String?
    let phoneVerified: Bool
    let mustChangePassword: Bool
    let profileImageUrl: String?
    var phase: String?
    var mentorId: Int?

    enum UserRole: String, Codable {
        case admin
        case mentor
        case patient
    }
}
