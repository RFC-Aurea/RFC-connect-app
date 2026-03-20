import SwiftUI
import AVFoundation

struct VoiceRecorderView: View {
    let onRecorded: (URL) -> Void
    @Environment(\.dismiss) var dismiss

    @State private var isRecording = false
    @State private var duration: TimeInterval = 0
    @State private var timer: Timer?
    @State private var recorder: AVAudioRecorder?
    @State private var recordingURL: URL?
    @State private var animationPhase = false

    var body: some View {
        VStack(spacing: 32) {
            Text("Voice Message")
                .font(.headline)
                .padding(.top, 20)

            // Waveform animation
            HStack(spacing: 4) {
                ForEach(0..<12, id: \.self) { i in
                    Capsule()
                        .fill(isRecording ? Color(hex: "1B4332") : Color.gray.opacity(0.3))
                        .frame(width: 4, height: isRecording ? CGFloat.random(in: 10...40) : 10)
                        .animation(
                            isRecording ? .easeInOut(duration: 0.3).repeatForever().delay(Double(i) * 0.05) : .default,
                            value: animationPhase
                        )
                }
            }
            .frame(height: 50)

            // Duration
            Text(formatDuration(duration))
                .font(.system(size: 36, weight: .light, design: .monospaced))
                .foregroundColor(isRecording ? Color(hex: "1B4332") : .secondary)

            // Hold to record button
            Circle()
                .fill(isRecording ? Color.red : Color(hex: "1B4332"))
                .frame(width: 80, height: 80)
                .overlay(
                    Image(systemName: isRecording ? "stop.fill" : "mic.fill")
                        .font(.title)
                        .foregroundColor(.white)
                )
                .scaleEffect(isRecording ? 1.1 : 1.0)
                .animation(.easeInOut(duration: 0.2), value: isRecording)
                .gesture(
                    LongPressGesture(minimumDuration: 0.1)
                        .onChanged { _ in startRecording() }
                        .simultaneously(with:
                            DragGesture(minimumDistance: 0)
                                .onEnded { _ in stopRecording() }
                        )
                )
                .simultaneousGesture(
                    TapGesture().onEnded {
                        if isRecording { stopRecording() } else { startRecording() }
                    }
                )

            Text(isRecording ? "Tap to stop" : "Tap or hold to record")
                .font(.caption)
                .foregroundColor(.secondary)

            Button("Cancel") { dismiss() }
                .foregroundColor(.red)
                .padding(.bottom, 20)
        }
        .frame(maxWidth: .infinity)
        .padding(.horizontal, 24)
    }

    private func startRecording() {
        guard !isRecording else { return }
        let session = AVAudioSession.sharedInstance()
        try? session.setCategory(.playAndRecord, mode: .default)
        try? session.setActive(true)

        let url = FileManager.default.temporaryDirectory.appendingPathComponent("voice_\(Date().timeIntervalSince1970).m4a")
        recordingURL = url

        let settings: [String: Any] = [
            AVFormatIDKey: Int(kAudioFormatMPEG4AAC),
            AVSampleRateKey: 44100,
            AVNumberOfChannelsKey: 1,
            AVEncoderAudioQualityKey: AVAudioQuality.high.rawValue
        ]

        recorder = try? AVAudioRecorder(url: url, settings: settings)
        recorder?.record()
        isRecording = true
        animationPhase.toggle()
        duration = 0
        timer = Timer.scheduledTimer(withTimeInterval: 0.1, repeats: true) { _ in
            duration += 0.1
            if duration >= 120 { stopRecording() }
        }
    }

    private func stopRecording() {
        guard isRecording else { return }
        recorder?.stop()
        timer?.invalidate()
        timer = nil
        isRecording = false
        animationPhase = false

        if let url = recordingURL, duration > 0.5 {
            onRecorded(url)
            dismiss()
        }
    }

    private func formatDuration(_ t: TimeInterval) -> String {
        let mins = Int(t) / 60
        let secs = Int(t) % 60
        return String(format: "%d:%02d", mins, secs)
    }
}
