import SwiftUI
import AVFoundation

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
    @State private var scrollProxy: ScrollViewProxy?
    @State private var typingDebounce: Task<Void, Never>?
    @State private var fullscreenImageURL: String?
    @StateObject private var voicePlayerManager = VoicePlayerManager()

    var body: some View {
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
                    await uploadAndSend(data: data, fileName: url.lastPathComponent, mimeType: "audio/mp4", type: "voice")
                }
            }
        }
        .confirmationDialog("Add Attachment", isPresented: $showAttachmentSheet) {
            Button("Photo") { showPhotoPicker = true }
            Button("Document") { showDocumentPicker = true }
            Button("Voice Message") { showVoiceRecorder = true }
            Button("Cancel", role: .cancel) {}
        }
        .alert("Report Message", isPresented: $showReportAlert) {
            Button("Report", role: .destructive) {
                if let id = reportedMessageId {
                    Task { try? await APIClient.shared.reportMessage(messageId: id) }
                }
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("This message will be reviewed by the RFC team.")
        }
        .overlay {
            if let urlString = fullscreenImageURL, let url = URL(string: urlString) {
                FullscreenImageView(url: url) {
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
                    PhotoBubble(urlString: message.attachment?.fileUrl ?? message.content, isMe: isMe) {
                        fullscreenImageURL = message.attachment?.fileUrl ?? message.content
                    }
                case "voice":
                    VoiceBubble(
                        urlString: message.attachment?.fileUrl ?? message.content,
                        durationSeconds: message.attachment?.durationSeconds,
                        isMe: isMe,
                        playerManager: voicePlayerManager,
                        messageId: message.id
                    )
                case "document":
                    DocumentBubble(
                        urlString: message.attachment?.fileUrl ?? message.content,
                        fileName: message.attachment?.fileName,
                        isMe: isMe
                    )
                default:
                    Text(message.content)
                        .padding(.horizontal, 14)
                        .padding(.vertical, 10)
                        .background(isMe ? Color(hex: "1B4332") : Color.white)
                        .foregroundColor(isMe ? .white : .primary)
                        .cornerRadius(18)
                }
                Text(formatTime(message.createdAt))
                    .font(.caption2)
                    .foregroundColor(.secondary)
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

    private func sendMessage() {
        let text = messageText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty else { return }
        messageText = ""
        isSending = true
        Task {
            do {
                let msg = try await APIClient.shared.sendMessage(to: partnerId, content: text)
                messages.append(msg)
            } catch { print("Chat error: \(error)") }
            isSending = false
        }
    }

    private func uploadAndSend(data: Data, fileName: String, mimeType: String, type: String) async {
        do {
            let attachment = try await APIClient.shared.uploadFile(data: data, fileName: fileName, mimeType: mimeType, type: type)
            let msg = try await APIClient.shared.sendMessage(to: partnerId, content: attachment.url, messageType: type)
            messages.append(msg)
        } catch {
            print("Upload/send error: \(error)")
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
    let urlString: String
    let isMe: Bool
    let onTap: () -> Void

    var body: some View {
        AsyncImage(url: URL(string: urlString)) { phase in
            switch phase {
            case .success(let image):
                image
                    .resizable()
                    .scaledToFill()
            case .failure:
                Image(systemName: "photo")
                    .foregroundColor(.secondary)
                    .frame(width: 200, height: 150)
            default:
                ProgressView()
                    .frame(width: 200, height: 150)
            }
        }
        .frame(maxWidth: 200, maxHeight: 200)
        .clipShape(RoundedRectangle(cornerRadius: 14))
        .onTapGesture(perform: onTap)
    }
}

// MARK: - Voice Bubble

private struct VoiceBubble: View {
    let urlString: String
    let durationSeconds: Int?
    let isMe: Bool
    let playerManager: VoicePlayerManager
    let messageId: Int

    private var isPlaying: Bool {
        playerManager.playingMessageId == messageId
    }

    var body: some View {
        Button {
            if isPlaying {
                playerManager.pause()
            } else {
                playerManager.play(urlString: urlString, messageId: messageId)
            }
        } label: {
            HStack(spacing: 10) {
                Image(systemName: isPlaying ? "pause.fill" : "play.fill")
                    .foregroundColor(isMe ? .white : Color(hex: "1B4332"))
                Text("Voice Message")
                    .font(.subheadline)
                    .foregroundColor(isMe ? .white : .primary)
                if let dur = durationSeconds {
                    Text("\(dur)s")
                        .font(.caption)
                        .foregroundColor(isMe ? .white.opacity(0.7) : .secondary)
                }
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 10)
            .background(isMe ? Color(hex: "1B4332") : Color.white)
            .cornerRadius(18)
        }
    }
}

// MARK: - Document Bubble

private struct DocumentBubble: View {
    let urlString: String
    let fileName: String?
    let isMe: Bool

    private var displayName: String {
        if let name = fileName, !name.isEmpty { return name }
        return URL(string: urlString)?.lastPathComponent ?? "Document"
    }

    var body: some View {
        Button {
            if let url = URL(string: urlString) {
                UIApplication.shared.open(url)
            }
        } label: {
            HStack(spacing: 10) {
                Image(systemName: "doc.fill")
                    .foregroundColor(isMe ? .white : Color(hex: "1B4332"))
                Text(displayName)
                    .font(.subheadline)
                    .foregroundColor(isMe ? .white : .primary)
                    .lineLimit(2)
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 10)
            .background(isMe ? Color(hex: "1B4332") : Color.white)
            .cornerRadius(18)
        }
    }
}

// MARK: - Fullscreen Image

private struct FullscreenImageView: View {
    let url: URL
    let onDismiss: () -> Void

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()
                .onTapGesture(perform: onDismiss)
            AsyncImage(url: url) { phase in
                switch phase {
                case .success(let image):
                    image
                        .resizable()
                        .scaledToFit()
                default:
                    ProgressView().tint(.white)
                }
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
    }
}

// MARK: - Voice Player Manager

class VoicePlayerManager: ObservableObject {
    @Published var playingMessageId: Int?
    private var player: AVPlayer?
    private var endObserver: Any?

    func play(urlString: String, messageId: Int) {
        guard let url = URL(string: urlString) else { return }

        // Stop current playback if different message
        if playingMessageId != messageId {
            cleanup()
        }

        let item = AVPlayerItem(url: url)
        player = AVPlayer(playerItem: item)

        // Configure audio session for playback
        try? AVAudioSession.sharedInstance().setCategory(.playback)
        try? AVAudioSession.sharedInstance().setActive(true)

        endObserver = NotificationCenter.default.addObserver(
            forName: .AVPlayerItemDidPlayToEndTime,
            object: item,
            queue: .main
        ) { [weak self] _ in
            self?.playingMessageId = nil
        }

        player?.play()
        playingMessageId = messageId
    }

    func pause() {
        player?.pause()
        playingMessageId = nil
    }

    private func cleanup() {
        player?.pause()
        if let obs = endObserver {
            NotificationCenter.default.removeObserver(obs)
            endObserver = nil
        }
        player = nil
        playingMessageId = nil
    }

    deinit {
        cleanup()
    }
}
