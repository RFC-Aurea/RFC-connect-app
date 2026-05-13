import SwiftUI
import AVFoundation

final class ImageCache {
    static let shared = ImageCache()
    private let cache = NSCache<NSString, UIImage>()
    func get(_ key: String) -> UIImage? { cache.object(forKey: key as NSString) }
    func set(_ key: String, _ image: UIImage) { cache.setObject(image, forKey: key as NSString) }
}

struct ChatView: View {
    @EnvironmentObject var auth: AuthService
    @ObservedObject var socketService = SocketService.shared

    let partnerId: Int
    let partnerName: String

    @State private var messages: [Message] = []
    @State private var messageText = ""
    @State private var isLoading = true
    @State private var isSending = false
    @State private var showAttachmentSheet = false
    @State private var showPhotoPicker = false
    @State private var showDocumentPicker = false
    @State private var showVoiceRecorder = false
    @State private var reportedMessageId: Int?
    @State private var showReportAlert = false
    @State private var reportReason = ""
    @State private var scrollProxy: ScrollViewProxy?
    @State private var typingDebounce: Task<Void, Never>?
    @State private var fullscreenImageURL: String?
    @State private var sendError: String?
    @State private var showUploadErrorAlert = false
    @State private var uploadErrorMessage = ""
    @State private var pendingUpload: PendingUpload?
    @StateObject private var voicePlayerManager = VoicePlayerManager()

    private struct PendingUpload {
        let data: Data
        let fileName: String
        let mimeType: String
        let type: String
        let durationSeconds: Int?
    }

    var body: some View {
        mainContent
            .alert("Report Message", isPresented: $showReportAlert) {
                TextField("Reason for reporting", text: $reportReason)
                Button("Report", role: .destructive) {
                    let trimmed = reportReason.trimmingCharacters(in: .whitespacesAndNewlines)
                    guard let id = reportedMessageId, !trimmed.isEmpty else {
                        reportReason = ""
                        return
                    }
                    reportReason = ""
                    Task { try? await APIClient.shared.reportMessage(messageId: id, reason: trimmed) }
                }
                Button("Cancel", role: .cancel) { reportReason = "" }
            } message: {
                Text("Tell us why you're reporting this message. The RFC team will review it.")
            }
            .alert("Upload Failed", isPresented: $showUploadErrorAlert) {
                Button("Retry") {
                    if let pending = pendingUpload {
                        Task { await uploadAndSend(data: pending.data, fileName: pending.fileName, mimeType: pending.mimeType, type: pending.type, durationSeconds: pending.durationSeconds) }
                    }
                }
                Button("Cancel", role: .cancel) { pendingUpload = nil }
            } message: {
                Text(uploadErrorMessage)
            }
    }

    private var mainContent: some View {
        VStack(spacing: 0) {
            // Medical disclaimer banner
            disclaimerBanner

            // Messages
            ScrollViewReader { proxy in
                ScrollView {
                    LazyVStack(spacing: 10) {
                        ForEach(messages) { message in
                            messageBubble(message: message)
                                .id(message.id)
                                .contextMenu {
                                    Button(role: .destructive) {
                                        reportedMessageId = message.id
                                        showReportAlert = true
                                    } label: {
                                        Label("Report Message", systemImage: "flag")
                                    }
                                }
                        }
                        if socketService.typingUserId == partnerId {
                            typingIndicator
                        }
                        Color.clear.frame(height: 1).id("bottom")
                    }
                    .padding(.horizontal, 16)
                    .padding(.vertical, 12)
                }
                .onAppear { scrollProxy = proxy }
                .onChange(of: messages.count) { _ in
                    withAnimation { proxy.scrollTo("bottom") }
                }
                .onChange(of: socketService.receivedMessage) { msg in
                    guard let msg, msg.senderId == partnerId || msg.receiverId == partnerId else { return }
                    if !messages.contains(where: { $0.id == msg.id }) {
                        messages.append(msg)
                    }
                }
            }

            // Input bar
            inputBar
        }
        .background(Color(hex: "F5F5F0"))
        .navigationTitle(partnerName)
        .navigationBarTitleDisplayMode(.inline)
        .task { await loadMessages() }
        .sheet(isPresented: $showPhotoPicker) {
            AttachmentPickerView { data, name, mime in
                Task { await uploadAndSend(data: data, fileName: name, mimeType: mime, type: "photo") }
            }
        }
        .sheet(isPresented: $showDocumentPicker) {
            DocumentPickerView { data, name, mime in
                Task { await uploadAndSend(data: data, fileName: name, mimeType: mime, type: "document") }
            }
        }
        .sheet(isPresented: $showVoiceRecorder) {
            VoiceRecorderView { url in
                Task {
                    guard let data = try? Data(contentsOf: url) else { return }
                    let duration: Int? = {
                        guard let player = try? AVAudioPlayer(contentsOf: url) else { return nil }
                        let seconds = Int(player.duration.rounded())
                        return seconds > 0 ? seconds : nil
                    }()
                    await uploadAndSend(data: data, fileName: url.lastPathComponent, mimeType: "audio/mp4", type: "voice", durationSeconds: duration)
                }
            }
        }
        .confirmationDialog("Add Attachment", isPresented: $showAttachmentSheet) {
            Button("Photo") { showPhotoPicker = true }
            Button("Document") { showDocumentPicker = true }
            Button("Voice Message") { showVoiceRecorder = true }
            Button("Cancel", role: .cancel) {}
        }
        .overlay {
            if let filePath = fullscreenImageURL {
                FullscreenImageView(filePath: filePath) {
                    fullscreenImageURL = nil
                }
            }
        }
    }

    private var disclaimerBanner: some View {
        HStack(spacing: 8) {
            Image(systemName: "info.circle.fill")
                .foregroundColor(Color(hex: "B8860B"))
            Text("Mentors provide peer support. For medical advice, contact your RFC team.")
                .font(.caption)
                .foregroundColor(Color(hex: "B8860B"))
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(hex: "B8860B").opacity(0.1))
    }

    private func messageBubble(message: Message) -> some View {
        let isMe = message.senderId == auth.currentUser?.id
        return HStack {
            if isMe { Spacer(minLength: 60) }
            VStack(alignment: isMe ? .trailing : .leading, spacing: 4) {
                switch message.messageType {
                case "photo", "image":
                    let photoPath = message.attachment?.url ?? message.content
                    PhotoBubble(filePath: photoPath, isMe: isMe) {
                        fullscreenImageURL = photoPath
                    }
                case "voice":
                    let voicePath = message.attachment?.url ?? message.content
                    VoiceBubble(
                        filePath: voicePath,
                        durationSeconds: message.attachment?.durationSeconds,
                        isMe: isMe,
                        playerManager: voicePlayerManager,
                        messageId: message.id
                    )
                case "document":
                    let docPath = message.attachment?.url ?? message.content
                    DocumentBubble(
                        filePath: docPath,
                        fileName: message.attachment?.fileName,
                        isMe: isMe
                    )
                default:
                    Text(message.content)
                        .padding(.horizontal, 14)
                        .padding(.vertical, 10)
                        .background(isMe ? Color(hex: "1B4332") : Color.white)
                        .foregroundColor(isMe ? .white : Color(hex: "1B4332"))
                        .cornerRadius(18)
                }
                Text(formatTime(message.createdAt))
                    .font(.caption2)
                    .foregroundColor(Color(hex: "666666"))
                    .padding(.horizontal, 4)
            }
            if !isMe { Spacer(minLength: 60) }
        }
    }

    private var typingIndicator: some View {
        HStack {
            HStack(spacing: 4) {
                ForEach(0..<3, id: \.self) { i in
                    Circle()
                        .fill(Color.secondary.opacity(0.6))
                        .frame(width: 8, height: 8)
                }
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 10)
            .background(Color.white)
            .cornerRadius(18)
            Spacer()
        }
    }

    private var inputBar: some View {
        VStack(spacing: 0) {
            if let sendError {
                Text(sendError)
                    .font(.caption)
                    .foregroundColor(.red)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 6)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Color.red.opacity(0.1))
            }

            HStack(spacing: 10) {
                Button(action: { showAttachmentSheet = true }) {
                    Image(systemName: "plus.circle.fill")
                        .font(.title2)
                        .foregroundColor(Color(hex: "1B4332"))
                }

                TextField("Message...", text: $messageText, axis: .vertical)
                    .lineLimit(1...4)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 10)
                    .background(Color.white)
                    .cornerRadius(20)
                    .overlay(RoundedRectangle(cornerRadius: 20).stroke(Color.gray.opacity(0.2)))
                    .onChange(of: messageText) { _ in
                        if sendError != nil { sendError = nil }
                        socketService.startTyping(to: partnerId)
                        typingDebounce?.cancel()
                        typingDebounce = Task {
                            try? await Task.sleep(nanoseconds: 2_000_000_000)
                            socketService.stopTyping(to: partnerId)
                        }
                    }

                Button(action: sendMessage) {
                    Image(systemName: "arrow.up.circle.fill")
                        .font(.title2)
                        .foregroundColor(messageText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? .gray : Color(hex: "1B4332"))
                }
                .disabled(messageText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || isSending)
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 10)
            .background(Color(hex: "F5F5F0"))
        }
    }

    private func sendMessage() {
        let trimmed = messageText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        let originalText = messageText
        messageText = ""
        sendError = nil
        isSending = true
        Task {
            do {
                let msg = try await APIClient.shared.sendMessage(to: partnerId, content: trimmed)
                messages.append(msg)
            } catch {
                // Restore the user's draft so they don't lose what they typed.
                // Only restore if they haven't started typing something else.
                if messageText.isEmpty { messageText = originalText }
                sendError = "Couldn't send message: \(error.localizedDescription)"
            }
            isSending = false
        }
    }

    private func uploadAndSend(data: Data, fileName: String, mimeType: String, type: String, durationSeconds: Int? = nil) async {
        do {
            let attachment = try await APIClient.shared.uploadFile(data: data, fileName: fileName, mimeType: mimeType, type: type, durationSeconds: durationSeconds)
            let msg = try await APIClient.shared.sendMessage(to: partnerId, content: attachment.url, messageType: type, attachmentId: attachment.attachmentId)
            messages.append(msg)
            pendingUpload = nil
        } catch {
            pendingUpload = PendingUpload(data: data, fileName: fileName, mimeType: mimeType, type: type, durationSeconds: durationSeconds)
            uploadErrorMessage = "Couldn't send \(type): \(error.localizedDescription)"
            showUploadErrorAlert = true
        }
    }

    private func loadMessages() async {
        isLoading = true
        do {
            messages = try await APIClient.shared.getMessages(with: partnerId)
        } catch { print("Chat error: \(error)") }
        isLoading = false
    }

    private func formatTime(_ str: String) -> String {
        let formats = ["yyyy-MM-dd'T'HH:mm:ss.SSSZ", "yyyy-MM-dd'T'HH:mm:ssZ", "yyyy-MM-dd HH:mm:ss"]
        let df = DateFormatter()
        for fmt in formats {
            df.dateFormat = fmt
            if let date = df.date(from: str) {
                df.dateFormat = "h:mm a"
                return df.string(from: date)
            }
        }
        return ""
    }
}

// MARK: - Photo Bubble

private struct PhotoBubble: View {
    let filePath: String
    let isMe: Bool
    let onTap: () -> Void

    @State private var image: UIImage?
    @State private var isLoading = true
    @State private var failed = false

    var body: some View {
        Group {
            if let image {
                Image(uiImage: image)
                    .resizable()
                    .scaledToFill()
            } else if failed {
                Image(systemName: "photo")
                    .foregroundColor(Color(hex: "666666"))
                    .frame(width: 200, height: 150)
            } else {
                ProgressView()
                    .frame(width: 200, height: 150)
            }
        }
        .frame(maxWidth: 200, maxHeight: 200)
        .clipShape(RoundedRectangle(cornerRadius: 14))
        .onTapGesture(perform: onTap)
        .task {
            if let cached = ImageCache.shared.get(filePath) {
                image = cached
                return
            }
            do {
                let data = try await APIClient.shared.downloadFileData(from: filePath)
                if let downloaded = UIImage(data: data) {
                    ImageCache.shared.set(filePath, downloaded)
                    image = downloaded
                } else {
                    failed = true
                }
            } catch {
                failed = true
            }
        }
    }
}

// MARK: - Voice Bubble (WhatsApp-style)

private struct VoiceBubble: View {
    let filePath: String
    let durationSeconds: Int?
    let isMe: Bool
    @ObservedObject var playerManager: VoicePlayerManager
    let messageId: Int

    private var isPlaying: Bool {
        playerManager.playingMessageId == messageId
    }

    private var isThisDownloading: Bool {
        playerManager.downloadingMessageId == messageId
    }

    private var progress: Double {
        guard playerManager.playingMessageId == messageId else { return 0 }
        guard playerManager.duration > 0 else { return 0 }
        return playerManager.currentTime / playerManager.duration
    }

    private var displayTime: String {
        if isPlaying {
            return formatSeconds(playerManager.currentTime)
        }
        if let dur = durationSeconds, dur > 0 {
            return formatSeconds(Double(dur))
        }
        if playerManager.playingMessageId == messageId, playerManager.duration > 0 {
            return formatSeconds(playerManager.duration)
        }
        return "0:00"
    }

    private var totalTime: String {
        if playerManager.playingMessageId == messageId, playerManager.duration > 0 {
            return formatSeconds(playerManager.duration)
        }
        if let dur = durationSeconds, dur > 0 {
            return formatSeconds(Double(dur))
        }
        return "0:00"
    }

    /// Deterministic waveform bar heights seeded by messageId
    private var waveformHeights: [CGFloat] {
        var seed = UInt64(abs(messageId))
        return (0..<28).map { _ in
            seed = seed &* 6364136223846793005 &+ 1442695040888963407
            let normalized = CGFloat((seed >> 33) % 100) / 100.0
            return 4 + normalized * 16 // heights between 4 and 20
        }
    }

    private let primaryColor = Color(hex: "1B4332")
    private var accentColor: Color { isMe ? .white : primaryColor }
    private var dimColor: Color { isMe ? .white.opacity(0.4) : Color(hex: "999999") }
    private var progressColor: Color { isMe ? .white : primaryColor }
    private var trackColor: Color { isMe ? .white.opacity(0.25) : Color(hex: "DDDDDD") }

    var body: some View {
        HStack(spacing: 10) {
            // Play/Pause circle button
            Button {
                if isPlaying {
                    playerManager.pause()
                } else {
                    playerManager.play(filePath: filePath, messageId: messageId)
                }
            } label: {
                ZStack {
                    Circle()
                        .fill(accentColor)
                        .frame(width: 40, height: 40)
                    if isThisDownloading {
                        ProgressView()
                            .tint(isMe ? primaryColor : .white)
                            .scaleEffect(0.8)
                    } else {
                        Image(systemName: isPlaying ? "pause.fill" : "play.fill")
                            .font(.system(size: 16, weight: .bold))
                            .foregroundColor(isMe ? primaryColor : .white)
                            .offset(x: isPlaying ? 0 : 1.5) // optical center for play icon
                    }
                }
            }
            .disabled(isThisDownloading)

            // Waveform + progress
            VStack(alignment: .leading, spacing: 6) {
                // Waveform bars
                GeometryReader { geo in
                    let barCount = waveformHeights.count
                    let spacing: CGFloat = 2
                    let barWidth: CGFloat = max(2, (geo.size.width - CGFloat(barCount - 1) * spacing) / CGFloat(barCount))
                    let filledBars = Int(progress * Double(barCount))

                    HStack(alignment: .center, spacing: spacing) {
                        ForEach(0..<barCount, id: \.self) { i in
                            RoundedRectangle(cornerRadius: 1.5)
                                .fill(i < filledBars ? progressColor : trackColor)
                                .frame(width: barWidth, height: waveformHeights[i])
                        }
                    }
                    .frame(height: geo.size.height, alignment: .center)
                }
                .frame(height: 20)

                // Time labels
                HStack {
                    Text(isPlaying ? displayTime : totalTime)
                        .font(.system(size: 11, weight: .medium, design: .monospaced))
                        .foregroundColor(dimColor)
                    Spacer()
                    if isPlaying {
                        Text(totalTime)
                            .font(.system(size: 11, weight: .medium, design: .monospaced))
                            .foregroundColor(dimColor)
                    }
                }
            }
            .frame(minWidth: 140)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 10)
        .background(isMe ? primaryColor : Color.white)
        .cornerRadius(18)
        .frame(maxWidth: 260)
    }

    private func formatSeconds(_ seconds: Double) -> String {
        let total = Int(max(0, seconds))
        let m = total / 60
        let s = total % 60
        return "\(m):\(String(format: "%02d", s))"
    }
}

// MARK: - Document Bubble

private struct DocumentBubble: View {
    let filePath: String
    let fileName: String?
    let isMe: Bool

    @State private var isDownloading = false
    @State private var localURL: URL?
    @State private var downloadErrorMessage = ""
    @State private var showDownloadErrorAlert = false

    private var displayName: String {
        if let name = fileName, !name.isEmpty { return name }
        return "Document"
    }

    var body: some View {
        Button {
            if let localURL {
                UIApplication.shared.open(localURL)
            } else {
                downloadAndOpen()
            }
        } label: {
            HStack(spacing: 10) {
                if isDownloading {
                    ProgressView()
                        .tint(isMe ? .white : Color(hex: "1B4332"))
                } else {
                    Image(systemName: "doc.fill")
                        .foregroundColor(isMe ? .white : Color(hex: "1B4332"))
                }
                Text(displayName)
                    .font(.subheadline)
                    .foregroundColor(isMe ? .white : Color(hex: "1B4332"))
                    .lineLimit(2)
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 10)
            .background(isMe ? Color(hex: "1B4332") : Color.white)
            .cornerRadius(18)
        }
        .disabled(isDownloading)
        .alert("Download Failed", isPresented: $showDownloadErrorAlert) {
            Button("Retry") { downloadAndOpen() }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text(downloadErrorMessage)
        }
    }

    private func downloadAndOpen() {
        isDownloading = true
        Task {
            do {
                let data = try await APIClient.shared.downloadFileData(from: filePath)
                let tempDir = FileManager.default.temporaryDirectory
                let name = fileName ?? "document"
                let fileURL = tempDir.appendingPathComponent(name)
                try data.write(to: fileURL)
                await MainActor.run {
                    localURL = fileURL
                    UIApplication.shared.open(fileURL)
                    isDownloading = false
                }
            } catch {
                await MainActor.run {
                    isDownloading = false
                    downloadErrorMessage = "Couldn't open this document: \(error.localizedDescription)"
                    showDownloadErrorAlert = true
                }
            }
        }
    }
}

// MARK: - Fullscreen Image

private struct FullscreenImageView: View {
    let filePath: String
    let onDismiss: () -> Void

    @State private var image: UIImage?

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()
                .onTapGesture(perform: onDismiss)
            if let image {
                Image(uiImage: image)
                    .resizable()
                    .scaledToFit()
            } else {
                ProgressView().tint(.white)
            }
        }
        .overlay(alignment: .topTrailing) {
            Button(action: onDismiss) {
                Image(systemName: "xmark.circle.fill")
                    .font(.title)
                    .foregroundColor(.white)
                    .padding()
            }
        }
        .task {
            if let data = try? await APIClient.shared.downloadFileData(from: filePath) {
                image = UIImage(data: data)
            }
        }
    }
}

// MARK: - Voice Player Manager

class VoicePlayerManager: ObservableObject {
    @Published var playingMessageId: Int?
    @Published var pausedMessageId: Int?
    @Published var downloadingMessageId: Int?
    @Published var currentTime: Double = 0
    @Published var duration: Double = 0

    private var player: AVAudioPlayer?
    private var displayLink: CADisplayLink?
    private var cachedFiles: [String: URL] = [:]
    private var downloadTask: Task<Void, Never>?

    func play(filePath: String, messageId: Int) {
        // Resume if this message was paused — pick up where we left off
        if pausedMessageId == messageId, let p = player, !p.isPlaying {
            p.play()
            playingMessageId = messageId
            pausedMessageId = nil
            startProgressUpdates()
            return
        }

        // Stop current playback if different message
        if playingMessageId != nil, playingMessageId != messageId {
            cleanup()
        }

        // If already cached, play immediately
        if let localURL = cachedFiles[filePath] {
            playLocal(url: localURL, messageId: messageId)
            return
        }

        // Cancel any in-flight download
        downloadTask?.cancel()

        // Download the file first
        downloadingMessageId = messageId
        downloadTask = Task { @MainActor in
            do {
                let data = try await APIClient.shared.downloadFileData(from: filePath)
                guard !Task.isCancelled else { return }
                let tempURL = FileManager.default.temporaryDirectory
                    .appendingPathComponent("voice_\(messageId).m4a")
                try data.write(to: tempURL)
                cachedFiles[filePath] = tempURL
                downloadingMessageId = nil
                playLocal(url: tempURL, messageId: messageId)
            } catch {
                if !Task.isCancelled {
                    downloadingMessageId = nil
                    print("Voice download error: \(error)")
                }
            }
        }
    }

    private func playLocal(url: URL, messageId: Int) {
        do {
            try AVAudioSession.sharedInstance().setCategory(.playback, mode: .default)
            try AVAudioSession.sharedInstance().setActive(true)
        } catch {
            print("AVAudioSession error: \(error)")
        }

        do {
            player = try AVAudioPlayer(contentsOf: url)
            player?.prepareToPlay()
            duration = player?.duration ?? 0
            player?.play()
            playingMessageId = messageId
            pausedMessageId = nil
            startProgressUpdates()
        } catch {
            print("AVAudioPlayer error: \(error)")
            playingMessageId = nil
        }
    }

    func pause() {
        pausedMessageId = playingMessageId
        playingMessageId = nil
        player?.pause()
        stopProgressUpdates()
    }

    private func startProgressUpdates() {
        stopProgressUpdates()
        displayLink = CADisplayLink(target: self, selector: #selector(updateProgress))
        displayLink?.preferredFrameRateRange = CAFrameRateRange(minimum: 10, maximum: 10)
        displayLink?.add(to: .main, forMode: .common)
    }

    private func stopProgressUpdates() {
        displayLink?.invalidate()
        displayLink = nil
    }

    @objc private func updateProgress() {
        guard let p = player else { return }
        currentTime = p.currentTime
        duration = p.duration

        // Detect end of playback
        if !p.isPlaying && currentTime >= duration - 0.05 {
            stopProgressUpdates()
            currentTime = 0
            playingMessageId = nil
        }
    }

    private func cleanup() {
        player?.stop()
        stopProgressUpdates()
        downloadTask?.cancel()
        downloadTask = nil
        player = nil
        playingMessageId = nil
        pausedMessageId = nil
        currentTime = 0
        duration = 0
    }

    deinit {
        cleanup()
    }
}
