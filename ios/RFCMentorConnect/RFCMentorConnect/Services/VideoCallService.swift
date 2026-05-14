// IMPORTANT: Add Daily iOS SDK via Xcode > File > Add Packages >
// https://github.com/daily-co/daily-client-ios.git (branch: main)
//
// This file imports `Daily` (the product from the daily-client-ios package).
// Builds will fail until the package has been added to the RFCMentorConnect
// target in Xcode.

import Foundation
import Daily

@MainActor
final class VideoCallService: NSObject, ObservableObject {
    static let shared = VideoCallService()

    @Published private(set) var isInCall = false
    @Published var isCameraOn = true
    @Published var isMicOn = true
    @Published private(set) var localVideoTrack: VideoTrack?
    @Published private(set) var remoteVideoTrack: VideoTrack?
    @Published private(set) var remoteParticipantName: String?

    /// Backend record id, set when joining. Used by the UI to call /end on hangup.
    @Published var currentVideoCallId: Int?

    private var callClient: CallClient?

    private override init() { super.init() }

    func joinCall(url: String, videoCallId: Int) async {
        guard let parsed = URL(string: url) else {
            print("[VideoCall] Invalid room URL: \(url)")
            return
        }

        currentVideoCallId = videoCallId
        let client = CallClient()
        client.delegate = self
        callClient = client

        do {
            _ = try await client.join(url: parsed)
            isInCall = true
            refreshTracks()
        } catch {
            print("[VideoCall] join failed: \(error.localizedDescription)")
            await leaveCall()
        }
    }

    func leaveCall() async {
        guard let client = callClient else {
            resetState()
            return
        }
        do {
            try await client.leave()
        } catch {
            print("[VideoCall] leave error: \(error.localizedDescription)")
        }
        callClient = nil
        resetState()
    }

    func toggleCamera() async {
        guard let client = callClient else { return }
        let newValue = !isCameraOn
        do {
            _ = try await client.setInputsEnabled([.camera: newValue])
            isCameraOn = newValue
        } catch {
            print("[VideoCall] camera toggle failed: \(error.localizedDescription)")
        }
    }

    func toggleMicrophone() async {
        guard let client = callClient else { return }
        let newValue = !isMicOn
        do {
            _ = try await client.setInputsEnabled([.microphone: newValue])
            isMicOn = newValue
        } catch {
            print("[VideoCall] microphone toggle failed: \(error.localizedDescription)")
        }
    }

    private func resetState() {
        isInCall = false
        isCameraOn = true
        isMicOn = true
        localVideoTrack = nil
        remoteVideoTrack = nil
        remoteParticipantName = nil
        currentVideoCallId = nil
    }

    private func refreshTracks() {
        guard let client = callClient else { return }
        let participants = client.participants
        localVideoTrack = participants.local.media?.camera.track

        // Use the first remote participant (1:1 call topology).
        if let remote = participants.remote.values.first {
            remoteVideoTrack = remote.media?.camera.track
            remoteParticipantName = remote.info.username
        } else {
            remoteVideoTrack = nil
            remoteParticipantName = nil
        }
    }
}

extension VideoCallService: CallClientDelegate {
    nonisolated func callClient(
        _ callClient: CallClient,
        callStateUpdated state: CallState
    ) {
        Task { @MainActor in
            switch state {
            case .left, .initialized:
                self.isInCall = false
                self.resetState()
            case .joined:
                self.isInCall = true
                self.refreshTracks()
            default:
                break
            }
        }
    }

    nonisolated func callClient(
        _ callClient: CallClient,
        participantJoined participant: Participant
    ) {
        Task { @MainActor in self.refreshTracks() }
    }

    nonisolated func callClient(
        _ callClient: CallClient,
        participantUpdated participant: Participant
    ) {
        Task { @MainActor in self.refreshTracks() }
    }

    nonisolated func callClient(
        _ callClient: CallClient,
        participantLeft participant: Participant,
        withReason reason: ParticipantLeftReason
    ) {
        Task { @MainActor in self.refreshTracks() }
    }

    nonisolated func callClient(
        _ callClient: CallClient,
        inputsUpdated inputs: InputSettings
    ) {
        Task { @MainActor in
            self.isCameraOn = inputs.camera.isEnabled
            self.isMicOn = inputs.microphone.isEnabled
        }
    }
}
