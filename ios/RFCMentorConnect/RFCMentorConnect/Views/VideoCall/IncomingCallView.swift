import SwiftUI
import AudioToolbox

struct IncomingCallView: View {
    let videoCallId: Int
    let roomUrl: String
    let callerName: String
    let onAccept: () -> Void
    let onReject: () -> Void

    @State private var ringTimer: Timer?
    @State private var animatePulse = false

    var body: some View {
        ZStack {
            LinearGradient(
                colors: [Color(hex: "1B4332"), Color(hex: "0A1F14")],
                startPoint: .top, endPoint: .bottom,
            )
            .ignoresSafeArea()

            VStack(spacing: 28) {
                Spacer()

                Text("Incoming Video Call")
                    .font(.subheadline)
                    .foregroundColor(.white.opacity(0.75))

                ZStack {
                    Circle()
                        .fill(Color.white.opacity(0.1))
                        .frame(width: 180, height: 180)
                        .scaleEffect(animatePulse ? 1.15 : 1.0)
                        .animation(
                            .easeInOut(duration: 1.2).repeatForever(autoreverses: true),
                            value: animatePulse,
                        )
                    Circle()
                        .fill(Color.white.opacity(0.18))
                        .frame(width: 140, height: 140)
                    Text(callerName.prefix(1).uppercased())
                        .font(.system(size: 52, weight: .bold))
                        .foregroundColor(.white)
                }

                Text(callerName)
                    .font(.title.bold())
                    .foregroundColor(.white)

                Spacer()

                HStack(spacing: 60) {
                    callButton(
                        systemImage: "phone.down.fill",
                        background: .red,
                        label: "Decline",
                    ) {
                        stopRing()
                        onReject()
                    }
                    callButton(
                        systemImage: "video.fill",
                        background: .green,
                        label: "Accept",
                    ) {
                        stopRing()
                        onAccept()
                    }
                }
                .padding(.bottom, 60)
            }
            .padding(.horizontal, 32)
        }
        .onAppear {
            animatePulse = true
            startRing()
        }
        .onDisappear { stopRing() }
    }

    private func callButton(
        systemImage: String,
        background: Color,
        label: String,
        action: @escaping () -> Void,
    ) -> some View {
        VStack(spacing: 10) {
            Button(action: action) {
                Image(systemName: systemImage)
                    .font(.system(size: 26, weight: .semibold))
                    .foregroundColor(.white)
                    .frame(width: 72, height: 72)
                    .background(Circle().fill(background))
                    .shadow(color: background.opacity(0.4), radius: 12, y: 4)
            }
            Text(label)
                .font(.caption)
                .foregroundColor(.white.opacity(0.85))
        }
    }

    private func startRing() {
        // System ringtone-like sound. SystemSoundID 1304 is a calling chime.
        AudioServicesPlaySystemSound(SystemSoundID(1304))
        ringTimer = Timer.scheduledTimer(withTimeInterval: 2.0, repeats: true) { _ in
            AudioServicesPlaySystemSound(SystemSoundID(1304))
        }
    }

    private func stopRing() {
        ringTimer?.invalidate()
        ringTimer = nil
    }
}
