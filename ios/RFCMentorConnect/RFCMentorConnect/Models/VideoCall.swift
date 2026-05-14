import Foundation

struct VideoCall: Codable, Identifiable {
    let id: Int
    let assignmentId: Int
    let roomName: String
    let roomUrl: String
    let status: String
    let scheduledAt: String?
    let startedAt: String?
    let endedAt: String?
    let initiatedBy: Int
    let createdAt: String
}

struct VideoCallStartResponse: Codable {
    let videoCallId: Int
    let roomUrl: String
    let roomName: String
}

struct VideoCallScheduleResponse: Codable {
    let videoCallId: Int
    let roomUrl: String
    let scheduledAt: String
}

struct VideoCallJoinResponse: Codable {
    let roomUrl: String
}
