import Foundation

extension Notification.Name {
    static let authSessionExpired = Notification.Name("authSessionExpired")
}

enum APIError: LocalizedError {
    case invalidURL
    case noData
    case decodingError(Error)
    case serverError(Int, String)
    case unauthorized
    case networkError(Error)

    var errorDescription: String? {
        switch self {
        case .invalidURL: return "Invalid URL"
        case .noData: return "No data received"
        case .decodingError(let e): return "Decoding error: \(e.localizedDescription)"
        case .serverError(let code, let msg): return "Server error \(code): \(msg)"
        case .unauthorized: return "Unauthorized"
        case .networkError(let e): return e.localizedDescription
        }
    }
}

final class APIClient {
    static let shared = APIClient()
    let baseURL = "https://rfc-connect-app-production.up.railway.app"

    private let session: URLSession
    private let decoder: JSONDecoder
    private let encoder: JSONEncoder

    private init() {
        session = URLSession.shared
        decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        encoder = JSONEncoder()
        encoder.keyEncodingStrategy = .convertToSnakeCase
    }

    private func request(_ path: String, method: String = "GET", body: [String: Any]? = nil) async throws -> (Data, URLResponse) {
        guard let url = URL(string: baseURL + path) else { throw APIError.invalidURL }
        var req = URLRequest(url: url)
        req.httpMethod = method
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if let token = KeychainHelper.shared.read(for: "accessToken") {
            req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        if let body = body {
            req.httpBody = try JSONSerialization.data(withJSONObject: body)
        }
        do {
            let result = try await session.data(for: req)
            return result
        } catch {
            throw APIError.networkError(error)
        }
    }

    private func requestWithRetry(_ path: String, method: String = "GET", body: [String: Any]? = nil) async throws -> Data {
        let (data, response) = try await request(path, method: method, body: body)
        guard let http = response as? HTTPURLResponse else { throw APIError.noData }

        if http.statusCode == 401 {
            // Try token refresh
            if try await refreshToken() {
                let (retryData, retryResponse) = try await request(path, method: method, body: body)
                guard let retryHttp = retryResponse as? HTTPURLResponse else { throw APIError.noData }
                if retryHttp.statusCode == 401 {
                    NotificationCenter.default.post(name: .authSessionExpired, object: nil)
                    throw APIError.unauthorized
                }
                return try validate(retryData, statusCode: retryHttp.statusCode)
            } else {
                NotificationCenter.default.post(name: .authSessionExpired, object: nil)
                throw APIError.unauthorized
            }
        }
        return try validate(data, statusCode: http.statusCode)
    }

    private func validate(_ data: Data, statusCode: Int) throws -> Data {
        guard (200..<300).contains(statusCode) else {
            let msg = (try? JSONSerialization.jsonObject(with: data) as? [String: Any])?["message"] as? String ?? "Unknown error"
            throw APIError.serverError(statusCode, msg)
        }
        return data
    }

    private func decode<T: Decodable>(_ type: T.Type, from data: Data) throws -> T {
        do {
            return try decoder.decode(T.self, from: data)
        } catch {
            throw APIError.decodingError(error)
        }
    }

    // MARK: - Auth

    struct LoginResponse: Codable {
        let accessToken: String?
        let refreshToken: String?
        let user: User?
        let requiresVerification: Bool?
        let userId: Int?
        let message: String?
    }

    func login(email: String, password: String) async throws -> LoginResponse {
        let data = try await requestWithRetry("/api/auth/login", method: "POST", body: ["email": email, "password": password])
        return try decode(LoginResponse.self, from: data)
    }

    func completeLogin(userId: Int, code: String) async throws -> LoginResponse {
        let data = try await requestWithRetry("/api/auth/complete-login", method: "POST", body: ["userId": userId, "verificationCode": code])
        return try decode(LoginResponse.self, from: data)
    }

    @discardableResult
    func refreshToken() async throws -> Bool {
        guard let refresh = KeychainHelper.shared.read(for: "refreshToken") else { return false }
        guard let url = URL(string: baseURL + "/api/auth/refresh") else { return false }
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.httpBody = try JSONSerialization.data(withJSONObject: ["refreshToken": refresh])
        let (data, response) = try await session.data(for: req)
        guard let http = response as? HTTPURLResponse, http.statusCode == 200 else { return false }
        struct RefreshResp: Codable {
            let accessToken: String
            let refreshToken: String
        }
        if let resp = try? decoder.decode(RefreshResp.self, from: data) {
            KeychainHelper.shared.save(resp.accessToken, for: "accessToken")
            KeychainHelper.shared.save(resp.refreshToken, for: "refreshToken")
            return true
        }
        return false
    }

    func logoutMobile(refreshToken: String) async throws {
        guard let url = URL(string: baseURL + "/api/auth/logout-mobile") else { throw APIError.invalidURL }
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.httpBody = try JSONSerialization.data(withJSONObject: ["refreshToken": refreshToken])
        _ = try await session.data(for: req)
    }

    func sendVerification(phone: String) async throws {
        _ = try await requestWithRetry("/api/auth/send-verification", method: "POST", body: ["phone": phone])
    }

    func verifyPhone(phone: String, code: String) async throws {
        _ = try await requestWithRetry("/api/auth/verify-phone", method: "POST", body: ["phone": phone, "code": code])
    }

    func changePassword(currentPassword: String, newPassword: String) async throws {
        _ = try await requestWithRetry("/api/auth/change-password", method: "POST", body: ["currentPassword": currentPassword, "newPassword": newPassword])
    }

    struct ForgotPasswordResponse: Codable {
        let message: String
    }

    func forgotPassword(email: String) async throws -> ForgotPasswordResponse {
        let (data, response) = try await request("/api/auth/forgot-password", method: "POST", body: ["email": email])
        guard let http = response as? HTTPURLResponse else { throw APIError.noData }
        let validated = try validate(data, statusCode: http.statusCode)
        return try decode(ForgotPasswordResponse.self, from: validated)
    }

    func getMe() async throws -> User {
        let data = try await requestWithRetry("/api/auth/me")
        return try decode(User.self, from: data)
    }

    func registerDeviceToken(token: String) async throws {
        _ = try await requestWithRetry("/api/auth/device-token", method: "POST", body: ["deviceToken": token])
    }

    // MARK: - Admin

    func getAdminOverview() async throws -> AdminOverview {
        let data = try await requestWithRetry("/api/admin/overview")
        return try decode(AdminOverview.self, from: data)
    }

    func createUser(name: String, email: String, role: String) async throws -> CreateUserResponse {
        let data = try await requestWithRetry("/api/admin/create-user", method: "POST", body: ["name": name, "email": email, "role": role])
        return try decode(CreateUserResponse.self, from: data)
    }

    func assignMentor(patientId: Int, mentorId: Int) async throws {
        _ = try await requestWithRetry("/api/mentor-assignments", method: "POST", body: ["patientId": patientId, "mentorId": mentorId])
    }

    func updatePhase(patientId: Int, phase: String) async throws {
        _ = try await requestWithRetry("/api/patients/\(patientId)/phase", method: "PATCH", body: ["phase": phase])
    }

    func deleteUser(userId: Int) async throws {
        _ = try await requestWithRetry("/api/admin/users/\(userId)", method: "DELETE")
    }

    // MARK: - Patient

    struct PatientDashboard: Codable {
        let user: User
        let phase: String?
        let mentor: MentorSummary?
        let assignmentId: Int?
    }

    func getPatientDashboard() async throws -> PatientDashboard {
        let data = try await requestWithRetry("/api/patient/dashboard")
        return try decode(PatientDashboard.self, from: data)
    }

    // MARK: - Mentor

    func getMentorMentees() async throws -> [PatientSummary] {
        let data = try await requestWithRetry("/api/mentor/mentees")
        return try decode([PatientSummary].self, from: data)
    }

    // MARK: - Messages

    func getMessages(with userId: Int) async throws -> [Message] {
        let data = try await requestWithRetry("/api/messages/\(userId)")
        return try decode([Message].self, from: data)
    }

    func sendMessage(to userId: Int, content: String, messageType: String = "text", attachmentId: Int? = nil) async throws -> Message {
        var body: [String: Any] = ["content": content, "messageType": messageType]
        if let attachmentId { body["attachmentId"] = attachmentId }
        let data = try await requestWithRetry("/api/messages/\(userId)", method: "POST", body: body)
        return try decode(Message.self, from: data)
    }

    func reportMessage(messageId: Int, reason: String) async throws {
        _ = try await requestWithRetry("/api/reports", method: "POST", body: ["messageId": messageId, "reason": reason])
    }

    // MARK: - Video Calls

    func startVideoCall() async throws -> VideoCallStartResponse {
        let data = try await requestWithRetry("/api/video-calls/start", method: "POST")
        return try decode(VideoCallStartResponse.self, from: data)
    }

    func scheduleVideoCall(scheduledAt: Date) async throws -> VideoCallScheduleResponse {
        let iso = ISO8601DateFormatter().string(from: scheduledAt)
        let data = try await requestWithRetry(
            "/api/video-calls/schedule",
            method: "POST",
            body: ["scheduledAt": iso],
        )
        return try decode(VideoCallScheduleResponse.self, from: data)
    }

    func joinVideoCall(callId: Int) async throws -> VideoCallJoinResponse {
        let data = try await requestWithRetry("/api/video-calls/\(callId)/join", method: "POST")
        return try decode(VideoCallJoinResponse.self, from: data)
    }

    func endVideoCall(callId: Int) async throws {
        _ = try await requestWithRetry("/api/video-calls/\(callId)/end", method: "POST")
    }

    func rejectVideoCall(callId: Int) async throws {
        _ = try await requestWithRetry("/api/video-calls/\(callId)/reject", method: "POST")
    }

    func getUpcomingVideoCalls() async throws -> [VideoCall] {
        let data = try await requestWithRetry("/api/video-calls/upcoming")
        return try decode([VideoCall].self, from: data)
    }

    // MARK: - Resources

    func getResources(phase: String? = nil) async throws -> [Resource] {
        var path = "/api/resources"
        if let phase = phase { path += "?phase=\(phase)" }
        let data = try await requestWithRetry(path)
        return try decode([Resource].self, from: data)
    }

    // MARK: - Authenticated File Access

    /// Returns the full URL for a relative API path (e.g. /api/files/5).
    func authenticatedURL(for path: String) -> URL? {
        URL(string: baseURL + path)
    }

    /// Downloads file data from a relative API path with auth token.
    func downloadFileData(from path: String) async throws -> Data {
        guard let url = URL(string: baseURL + path) else { throw APIError.invalidURL }
        var req = URLRequest(url: url)
        if let token = KeychainHelper.shared.read(for: "accessToken") {
            req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        let (data, response) = try await session.data(for: req)
        guard let http = response as? HTTPURLResponse else { throw APIError.noData }
        if http.statusCode == 401 {
            if try await refreshToken() {
                var retryReq = URLRequest(url: url)
                if let token = KeychainHelper.shared.read(for: "accessToken") {
                    retryReq.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
                }
                let (retryData, retryResponse) = try await session.data(for: retryReq)
                guard let retryHttp = retryResponse as? HTTPURLResponse else { throw APIError.noData }
                if retryHttp.statusCode == 401 { throw APIError.unauthorized }
                return try validate(retryData, statusCode: retryHttp.statusCode)
            }
            throw APIError.unauthorized
        }
        return try validate(data, statusCode: http.statusCode)
    }

    // MARK: - File Upload

    struct UploadResponse: Codable {
        let attachmentId: Int
        let url: String
        let type: String
    }

    func uploadFile(data fileData: Data, fileName: String, mimeType: String, type: String, durationSeconds: Int? = nil) async throws -> UploadResponse {
        guard let url = URL(string: baseURL + "/api/upload") else { throw APIError.invalidURL }
        let boundary = UUID().uuidString
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")
        if let token = KeychainHelper.shared.read(for: "accessToken") {
            req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        var body = Data()
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"type\"\r\n\r\n".data(using: .utf8)!)
        body.append("\(type)\r\n".data(using: .utf8)!)
        if type == "voice", let durationSeconds {
            body.append("--\(boundary)\r\n".data(using: .utf8)!)
            body.append("Content-Disposition: form-data; name=\"duration\"\r\n\r\n".data(using: .utf8)!)
            body.append("\(durationSeconds)\r\n".data(using: .utf8)!)
        }
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"file\"; filename=\"\(fileName)\"\r\n".data(using: .utf8)!)
        body.append("Content-Type: \(mimeType)\r\n\r\n".data(using: .utf8)!)
        body.append(fileData)
        body.append("\r\n--\(boundary)--\r\n".data(using: .utf8)!)
        req.httpBody = body
        let (respData, response) = try await session.data(for: req)
        guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            throw APIError.serverError(0, "Upload failed")
        }
        return try decode(UploadResponse.self, from: respData)
    }
}
