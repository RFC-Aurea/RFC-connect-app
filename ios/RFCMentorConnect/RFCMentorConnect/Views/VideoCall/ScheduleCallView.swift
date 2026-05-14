import SwiftUI

struct ScheduleCallView: View {
    @Environment(\.dismiss) private var dismiss

    @State private var scheduledDate = Date().addingTimeInterval(60 * 60)
    @State private var isSubmitting = false
    @State private var errorMessage: String?
    @State private var confirmedTime: Date?

    var body: some View {
        NavigationStack {
            ZStack {
                Color(hex: "F5F5F0").ignoresSafeArea()

                VStack(spacing: 20) {
                    if let confirmed = confirmedTime {
                        confirmationView(time: confirmed)
                    } else {
                        formView
                    }
                }
                .padding(20)
            }
            .navigationTitle("Schedule Call")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
            }
        }
    }

    private var formView: some View {
        VStack(spacing: 18) {
            VStack(alignment: .leading, spacing: 8) {
                Text("Pick a date and time")
                    .font(.subheadline.bold())
                    .foregroundColor(Color(hex: "1B4332"))
                DatePicker(
                    "",
                    selection: $scheduledDate,
                    in: Date()...,
                    displayedComponents: [.date, .hourAndMinute],
                )
                .datePickerStyle(.graphical)
                .tint(Color(hex: "1B4332"))
            }
            .padding(16)
            .background(Color.white)
            .cornerRadius(16)
            .shadow(color: .black.opacity(0.05), radius: 4, y: 2)

            if let errorMessage {
                Text(errorMessage)
                    .font(.caption)
                    .foregroundColor(.red)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }

            Button(action: schedule) {
                HStack {
                    if isSubmitting {
                        ProgressView().tint(.white)
                    } else {
                        Image(systemName: "video.badge.plus")
                        Text("Schedule Call")
                            .font(.subheadline.bold())
                    }
                }
                .frame(maxWidth: .infinity)
                .frame(height: 48)
                .background(Color(hex: "1B4332"))
                .foregroundColor(.white)
                .cornerRadius(12)
            }
            .disabled(isSubmitting)

            Spacer()
        }
    }

    private func confirmationView(time: Date) -> some View {
        VStack(spacing: 18) {
            Image(systemName: "checkmark.circle.fill")
                .font(.system(size: 56))
                .foregroundColor(Color(hex: "1B4332"))
                .padding(.top, 32)
            Text("Call Scheduled")
                .font(.title2.bold())
                .foregroundColor(Color(hex: "1B4332"))
            Text(formatDate(time))
                .font(.headline)
                .foregroundColor(Color(hex: "666666"))
                .multilineTextAlignment(.center)
            Text("We'll notify both of you when it's time.")
                .font(.subheadline)
                .foregroundColor(Color(hex: "666666"))
                .multilineTextAlignment(.center)

            Spacer()

            Button(action: { dismiss() }) {
                Text("Done")
                    .font(.subheadline.bold())
                    .frame(maxWidth: .infinity)
                    .frame(height: 48)
                    .background(Color(hex: "1B4332"))
                    .foregroundColor(.white)
                    .cornerRadius(12)
            }
        }
        .padding(.horizontal, 8)
    }

    private func schedule() {
        errorMessage = nil
        isSubmitting = true
        Task {
            do {
                _ = try await APIClient.shared.scheduleVideoCall(scheduledAt: scheduledDate)
                await MainActor.run {
                    confirmedTime = scheduledDate
                    isSubmitting = false
                }
            } catch {
                await MainActor.run {
                    errorMessage = "Couldn't schedule: \(error.localizedDescription)"
                    isSubmitting = false
                }
            }
        }
    }

    private func formatDate(_ date: Date) -> String {
        let df = DateFormatter()
        df.dateStyle = .full
        df.timeStyle = .short
        return df.string(from: date)
    }
}
