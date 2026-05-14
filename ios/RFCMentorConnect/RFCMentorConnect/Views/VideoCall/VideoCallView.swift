// IMPORTANT: Add Daily iOS SDK via Xcode > File > Add Packages >
// https://github.com/daily-co/daily-client-ios.git (branch: main)

import SwiftUI
import Daily

struct VideoCallView: View {
    @ObservedObject private var service = VideoCallService.shared
    @Environment(\.dismiss) private var dismiss

    let videoCallId: Int
    let roomUrl: String

    @State private var callStart = Date()
    @State private var elapsed: TimeInterval = 0
    @State private var pipOffset: CGSize = .zero
    @State private var pipDragStart: CGSize = .zero
    @State private var timer: Timer?

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            // Remote video — full screen
            Group {
                if let track = service.remoteVideoTrack {
                    DailyVideoView(track: track)
                        .ignoresSafeArea()
                } else {
                    waitingView
                }
            }

            // Local PiP — draggable
            if let local = service.localVideoTrack {
                DailyVideoView(track: local)
                    .frame(width: 110, height: 160)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                    .overlay(
                        RoundedRectangle(cornerRadius: 12)
                            .stroke(Color.white.opacity(0.4), lineWidth: 1)
                    )
                    .offset(x: pipOffset.width, y: pipOffset.height)
                    .gesture(
                        DragGesture()
                            .onChanged { value in
                                pipOffset = CGSize(
                                    width: pipDragStart.width + value.translation.width,
                                    height: pipDragStart.height + value.translation.height,
                                )
                            }
                            .onEnded { _ in pipDragStart = pipOffset }
                    )
                    .position(initialPiPPosition)
                    .padding(20)
            }

            VStack {
                topBar
                Spacer()
                bottomBar
            }
        }
        .statusBarHidden()
        .task {
            await service.joinCall(url: roomUrl, videoCallId: videoCallId)
            callStart = Date()
            timer = Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { _ in
                elapsed = Date().timeIntervalSince(callStart)
            }
        }
        .onChange(of: service.isInCall) { inCall in
            if !inCall {
                cleanupAndDismiss()
            }
        }
        .onDisappear {
            timer?.invalidate()
            timer = nil
        }
    }

    private var initialPiPPosition: CGPoint {
        // Top-right corner anchor (PIP-style).
        CGPoint(x: UIScreen.main.bounds.width - 80, y: 140)
    }

    private var topBar: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text(service.remoteParticipantName ?? "Connecting…")
                    .font(.headline)
                    .foregroundColor(.white)
                Text(formatDuration(elapsed))
                    .font(.caption.monospacedDigit())
                    .foregroundColor(.white.opacity(0.75))
            }
            Spacer()
        }
        .padding(.horizontal, 20)
        .padding(.top, 24)
        .padding(.bottom, 16)
        .background(
            LinearGradient(
                colors: [Color.black.opacity(0.6), Color.black.opacity(0)],
                startPoint: .top, endPoint: .bottom,
            )
            .ignoresSafeArea(edges: .top)
        )
    }

    private var bottomBar: some View {
        HStack(spacing: 28) {
            controlButton(
                systemImage: service.isMicOn ? "mic.fill" : "mic.slash.fill",
                background: service.isMicOn ? Color.white.opacity(0.2) : Color.red,
            ) {
                Task { await service.toggleMicrophone() }
            }

            controlButton(
                systemImage: service.isCameraOn ? "video.fill" : "video.slash.fill",
                background: service.isCameraOn ? Color.white.opacity(0.2) : Color.red,
            ) {
                Task { await service.toggleCamera() }
            }

            controlButton(
                systemImage: "phone.down.fill",
                background: Color.red,
            ) {
                Task { await endCall() }
            }
        }
        .padding(.bottom, 40)
        .padding(.top, 24)
        .frame(maxWidth: .infinity)
        .background(
            LinearGradient(
                colors: [Color.black.opacity(0), Color.black.opacity(0.6)],
                startPoint: .top, endPoint: .bottom,
            )
            .ignoresSafeArea(edges: .bottom)
        )
    }

    private var waitingView: some View {
        VStack(spacing: 16) {
            ProgressView()
                .progressViewStyle(.circular)
                .tint(.white)
                .scaleEffect(1.3)
            Text("Waiting for the other person to join…")
                .font(.subheadline)
                .foregroundColor(.white.opacity(0.85))
        }
    }

    private func controlButton(
        systemImage: String,
        background: Color,
        action: @escaping () -> Void,
    ) -> some View {
        Button(action: action) {
            Image(systemName: systemImage)
                .font(.system(size: 22, weight: .semibold))
                .foregroundColor(.white)
                .frame(width: 64, height: 64)
                .background(Circle().fill(background))
        }
    }

    private func endCall() async {
        timer?.invalidate()
        timer = nil
        do {
            try await APIClient.shared.endVideoCall(callId: videoCallId)
        } catch {
            print("[VideoCall] endVideoCall API failed: \(error.localizedDescription)")
        }
        await service.leaveCall()
        dismiss()
    }

    private func cleanupAndDismiss() {
        timer?.invalidate()
        timer = nil
        dismiss()
    }

    private func formatDuration(_ secs: TimeInterval) -> String {
        let total = Int(secs)
        let h = total / 3600
        let m = (total % 3600) / 60
        let s = total % 60
        if h > 0 { return String(format: "%d:%02d:%02d", h, m, s) }
        return String(format: "%d:%02d", m, s)
    }
}

// MARK: - Daily VideoView wrapper

struct DailyVideoView: UIViewRepresentable {
    let track: VideoTrack

    func makeUIView(context: Context) -> VideoView {
        let view = VideoView()
        view.track = track
        view.videoScaleMode = .fill
        return view
    }

    func updateUIView(_ uiView: VideoView, context: Context) {
        if uiView.track !== track {
            uiView.track = track
        }
    }
}
