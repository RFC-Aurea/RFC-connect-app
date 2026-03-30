import Foundation

struct AdminOverview: Codable {
    let patients: [PatientSummary]
    let mentors: [MentorSummary]
    let admins: [AdminSummary]?
    let assignments: [MentorAssignment]
}

struct PatientSummary: Codable, Identifiable {
    let id: Int
    let name: String
    let email: String
    let phase: String?
    let mentorId: Int?
    let status: String
    let username: String?
    let phoneVerified: Bool?
    let mustChangePassword: Bool?
}

struct MentorSummary: Codable, Identifiable {
    let id: Int
    let name: String
    let email: String
    let status: String
    let username: String?
    let phoneVerified: Bool?
    let mustChangePassword: Bool?
}

struct AdminSummary: Codable, Identifiable {
    let id: Int
    let name: String
    let email: String
    let status: String
    let username: String?
}

struct MentorAssignment: Codable, Identifiable {
    let id: Int
    let mentorId: Int
    let patientId: Int
    let assignedBy: Int
}

struct CreateUserResponse: Codable {
    let id: Int
    let name: String
    let email: String
    let username: String
    let role: String
    let status: String
    let tempPassword: String
}
