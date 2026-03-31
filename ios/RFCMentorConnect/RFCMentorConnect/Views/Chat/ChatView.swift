import SwiftUI

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
                if message.messageType == "voice" {
                    voiceBubble(message: message, isMe: isMe)
                } else if message.messageType == "image" {
                    imageBubble(message: message, isMe: isMe)
                } else {
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

    private func voiceBubble(message: Message, isMe: Bool) -> some View {
        HStack(spacing: 10) {
            Image(systemName: "waveform")
                .foregroundColor(isMe ? .white : Color(hex: "1B4332"))
            if let dur = message.attachment?.durationSeconds {
                Text("\(dur)s")
                    .font(.caption)
                    .foregroundColor(isMe ? .white.opacity(0.8) : .secondary)
            }
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 10)
        .background(isMe ? Color(hex: "1B4332") : Color.white)
        .cornerRadius(18)
    }

    private func imageBubble(message: Message, isMe: Bool) -> some View {
        AsyncImage(url: URL(string: message.attachment?.fileUrl ?? "")) { img in
            img.resizable().scaledToFill()
        } placeholder: {
            ProgressView()
        }
        .frame(width: 200, height: 150)
        .clipShape(RoundedRectangle(cornerRadius: 14))
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
            let msg = try await APIClient.shared.sendMessage(to: partnerId, content: attachment.fileUrl, messageType: type)
            messages.append(msg)
        } catch { print("Chat error: \(error)") }
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
