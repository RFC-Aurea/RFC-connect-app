import Foundation

struct AdminOverview: Codable {
    let patients: [PatientSummary]
    let mentors: [MentorSummary]
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
}

struct MentorSummary: Codable, Identifiable {
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
    let user: CreatedUser
    let username: String
    let temporaryPassword: String
}

struct CreatedUser: Codable, Identifiable {
    let id: Int
    let name: String
    let email: String
    let role: String
    let username: String
}
