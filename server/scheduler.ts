import { Resend } from "resend";
import { db } from "./db";
import { videoCalls, mentorAssignments, users } from "../shared/schema";
import { and, eq, gte, lte } from "drizzle-orm";
import { storage } from "./storage";
import { getIO } from "./socket";
import { sendPushNotification } from "./apns";

const resendApiKey = process.env.RESEND_API_KEY;
const emailEnabled = !!resendApiKey;

const remindedCallIds = new Set<number>();
const CHECK_INTERVAL_MS = 60_000;
const REMINDER_LEAD_MS = 10 * 60 * 1000;

async function sendCallReminderEmail(to: string, scheduledAt: Date): Promise<void> {
  const subject = "Video Call Reminder — RFC Mentor Connect";
  const friendlyTime = scheduledAt.toLocaleString("en-US", {
    month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
  });
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#eaeae6;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#eaeae6;padding:24px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:10px;overflow:hidden;max-width:600px;border:1px solid #d4d4cc;">
          <tr>
            <td style="background-color:#1B4332;padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#F5F5F0;font-size:26px;font-weight:700;letter-spacing:0.5px;">RFC Mentor Connect</h1>
              <p style="margin:8px 0 0;color:#B8860B;font-size:14px;font-weight:600;letter-spacing:1px;text-transform:uppercase;">Video Call Reminder</p>
            </td>
          </tr>
          <tr>
            <td style="padding:40px;">
              <h2 style="margin:0 0 16px;color:#1B4332;font-size:22px;">Your video call starts in 10 minutes</h2>
              <p style="margin:0 0 16px;color:#475569;font-size:15px;line-height:1.7;">
                Your scheduled call at <strong>${friendlyTime}</strong> is coming up. Open the RFC Mentor Connect app to join.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#F5F5F0;padding:20px 40px;text-align:center;border-top:2px solid #1B4332;">
              <p style="margin:0;color:#888;font-size:12px;">Questions? Contact your RFC clinical team.</p>
              <p style="margin:6px 0 0;color:#B8860B;font-size:12px;font-weight:600;">© 2026 Rejuvenating Fertility Center</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();

  if (!emailEnabled) {
    console.log(`[scheduler] Dev mode — would send call reminder email to ${to} for ${friendlyTime}`);
    return;
  }

  const resend = new Resend(resendApiKey!);
  const { error } = await resend.emails.send({
    from: "RFC Mentor Connect <info@rejuvenatingfertility.com>",
    replyTo: "alifiyab@rfcfertility.com",
    to,
    subject,
    html,
  });
  if (error) {
    console.error("[scheduler] Resend error:", error.message);
  }
}

async function processReminders(): Promise<void> {
  const now = Date.now();
  const windowStart = new Date(now);
  const windowEnd = new Date(now + REMINDER_LEAD_MS + CHECK_INTERVAL_MS);

  const upcoming = await db
    .select()
    .from(videoCalls)
    .where(
      and(
        eq(videoCalls.status, "scheduled"),
        gte(videoCalls.scheduledAt, windowStart),
        lte(videoCalls.scheduledAt, windowEnd),
      ),
    );

  for (const call of upcoming) {
    if (!call.scheduledAt) continue;
    if (remindedCallIds.has(call.id)) continue;
    const msToCall = call.scheduledAt.getTime() - now;
    if (msToCall > REMINDER_LEAD_MS) continue;
    if (msToCall < 0) continue;

    remindedCallIds.add(call.id);

    const [assignment] = await db
      .select()
      .from(mentorAssignments)
      .where(eq(mentorAssignments.id, call.assignmentId));
    if (!assignment) continue;

    const [mentor] = await db.select().from(users).where(eq(users.id, assignment.mentorId));
    const [patient] = await db.select().from(users).where(eq(users.id, assignment.patientId));
    const participants = [mentor, patient].filter(Boolean);

    const io = getIO();
    if (io) {
      io.to(`assignment:${assignment.id}`).emit("video-call:reminder", {
        videoCallId: call.id,
        roomUrl: call.roomUrl,
        scheduledAt: call.scheduledAt.toISOString(),
      });
    }

    for (const user of participants) {
      if (user.apnsDeviceToken) {
        sendPushNotification(user.apnsDeviceToken, {
          title: "Video Call Reminder",
          body: "Your video call starts in 10 minutes",
          data: {
            type: "video_call_reminder",
            videoCallId: call.id,
            roomUrl: call.roomUrl,
          },
        }).catch(err => console.error("[scheduler] push failed:", err));
      }
      sendCallReminderEmail(user.email, call.scheduledAt)
        .catch(err => console.error("[scheduler] email failed:", err));
    }
  }

  if (remindedCallIds.size > 500) {
    const ids = Array.from(remindedCallIds);
    for (const id of ids.slice(0, ids.length - 250)) {
      remindedCallIds.delete(id);
    }
  }
}

export function startScheduler(): void {
  setInterval(() => {
    processReminders().catch(err => console.error("[scheduler] error:", err));
  }, CHECK_INTERVAL_MS);
  console.log("[scheduler] Video call reminder scheduler started");
}
