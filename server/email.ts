import { Resend } from "resend";
import { promises as dns } from "dns";

const resendApiKey = process.env.RESEND_API_KEY;

export const emailEnabled = !!resendApiKey;

if (!emailEnabled) {
  console.warn(
    "[email] RESEND_API_KEY not set — " +
      "email sending disabled. Set the env var to enable.",
  );
}

export async function validateEmailDomain(email: string): Promise<boolean> {
  try {
    const domain = email.split("@")[1];
    if (!domain) return false;
    const records = await dns.resolveMx(domain);
    return records.length > 0;
  } catch {
    return false;
  }
}

function buildEmailHtml(params: {
  name: string;
  role: string;
  email: string;
  tempPassword: string;
}): { subject: string; html: string } {
  const { name, role, email, tempPassword } = params;

  const header = `
    <tr>
      <td style="background-color:#1B4332;padding:32px 40px;text-align:center;">
        <h1 style="margin:0;color:#F5F5F0;font-size:26px;font-weight:700;letter-spacing:0.5px;">RFC Mentor Connect</h1>
        <p style="margin:8px 0 0;color:#B8860B;font-size:14px;font-weight:600;letter-spacing:1px;text-transform:uppercase;">Rejuvenating Fertility Center</p>
      </td>
    </tr>`;

  const credentialsBox = `
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#F5F5F0;border:2px solid #1B4332;border-radius:8px;margin-bottom:28px;">
      <tr>
        <td style="padding:20px 24px;">
          <p style="margin:0 0 10px;font-size:13px;color:#444;">
            <strong style="color:#1B4332;">Email:</strong>&nbsp; ${email}
          </p>
          <p style="margin:0;font-size:13px;color:#444;">
            <strong style="color:#1B4332;">Temporary Password:</strong>&nbsp;
            <span style="font-family:monospace;background-color:#e8e8e2;padding:3px 8px;border-radius:4px;font-size:14px;">${tempPassword}</span>
          </p>
        </td>
      </tr>
    </table>`;

  const setupSteps = `
    <h3 style="margin:0 0 12px;color:#1B4332;font-size:16px;">Getting Started</h3>
    <ol style="margin:0 0 24px;padding-left:20px;color:#475569;font-size:15px;line-height:1.8;">
      <li>Download the <strong>RFC Mentor Connect</strong> app</li>
      <li>Sign in with your email and temporary password above</li>
      <li>Verify your phone number</li>
      <li>Create a new password</li>
    </ol>`;

  const footer = `
    <tr>
      <td style="background-color:#F5F5F0;padding:20px 40px;text-align:center;border-top:2px solid #1B4332;">
        <p style="margin:0;color:#888;font-size:12px;">Questions? Contact your RFC clinical team.</p>
        <p style="margin:6px 0 0;color:#B8860B;font-size:12px;font-weight:600;">© 2026 Rejuvenating Fertility Center</p>
      </td>
    </tr>`;

  if (role === "patient") {
    const subject =
      "Welcome to RFC Mentor Connect — Your Fertility Support Starts Here";
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#eaeae6;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#eaeae6;padding:24px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:10px;overflow:hidden;max-width:600px;border:1px solid #d4d4cc;">
          ${header}
          <tr>
            <td style="padding:40px;">
              <h2 style="margin:0 0 16px;color:#1B4332;font-size:22px;">Hi ${name},</h2>
              <p style="margin:0 0 16px;color:#475569;font-size:15px;line-height:1.7;">
                You've been added to <strong>RFC Mentor Connect</strong> by the Rejuvenating Fertility Center team.
              </p>
              <p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.7;">
                As a patient, you'll be connected with a peer mentor who has been through the fertility journey themselves — someone who truly understands what you're going through.
              </p>
              <h3 style="margin:0 0 12px;color:#1B4332;font-size:16px;">Your Login Credentials</h3>
              ${credentialsBox}
              ${setupSteps}
              <h3 style="margin:0 0 12px;color:#1B4332;font-size:16px;">What You'll Find in the App</h3>
              <ul style="margin:0 0 24px;padding-left:20px;color:#475569;font-size:15px;line-height:1.8;">
                <li>Direct messaging with your assigned mentor</li>
                <li>A Journey Hub with resources for every phase of treatment</li>
                <li>Support from someone who truly understands</li>
              </ul>
            </td>
          </tr>
          ${footer}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();
    return { subject, html };
  }

  if (role === "mentor") {
    const subject =
      "Welcome to RFC Mentor Connect — Thank You for Being a Mentor";
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#eaeae6;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#eaeae6;padding:24px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:10px;overflow:hidden;max-width:600px;border:1px solid #d4d4cc;">
          ${header}
          <tr>
            <td style="padding:40px;">
              <h2 style="margin:0 0 16px;color:#1B4332;font-size:22px;">Hi ${name},</h2>
              <p style="margin:0 0 16px;color:#475569;font-size:15px;line-height:1.7;">
                Thank you for joining <strong>RFC Mentor Connect</strong> as a peer mentor.
              </p>
              <p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.7;">
                Your role is to provide emotional support and share your personal experience with patients going through fertility treatment. Your journey matters — and it can make a real difference for someone else.
              </p>
              <h3 style="margin:0 0 12px;color:#1B4332;font-size:16px;">Your Login Credentials</h3>
              ${credentialsBox}
              ${setupSteps}
              <h3 style="margin:0 0 12px;color:#1B4332;font-size:16px;">Important Reminders</h3>
              <ul style="margin:0 0 24px;padding-left:20px;color:#475569;font-size:15px;line-height:1.8;">
                <li>Always refer medical questions to the RFC clinical team</li>
                <li>Respond to messages within 48 hours when possible</li>
                <li>Your experience matters — you're making a real difference</li>
              </ul>
            </td>
          </tr>
          ${footer}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();
    return { subject, html };
  }

  // admin (default)
  const subject = "RFC Mentor Connect — Admin Account Created";
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#eaeae6;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#eaeae6;padding:24px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:10px;overflow:hidden;max-width:600px;border:1px solid #d4d4cc;">
          ${header}
          <tr>
            <td style="padding:40px;">
              <h2 style="margin:0 0 16px;color:#1B4332;font-size:22px;">Hi ${name},</h2>
              <p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.7;">
                An admin account has been created for you on <strong>RFC Mentor Connect</strong>.
              </p>
              <h3 style="margin:0 0 12px;color:#1B4332;font-size:16px;">Your Login Credentials</h3>
              ${credentialsBox}
              ${setupSteps}
              <p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.7;">
                As an admin, you can create and manage mentor and patient accounts, assign mentors to patients, and oversee the platform.
              </p>
            </td>
          </tr>
          ${footer}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();
  return { subject, html };
}

export async function sendWelcomeEmail(params: {
  to: string;
  name: string;
  role: string;
  username: string;
  tempPassword: string;
}): Promise<void> {
  const { to, name, role, username: _username, tempPassword } = params;

  const { subject, html } = buildEmailHtml({ name, role, email: to, tempPassword });

  if (!emailEnabled) {
    console.log(
      `[email] Dev mode — would send welcome email to ${to}:\n` +
        `  Subject: ${subject}\n` +
        `  Role: ${role}, Email: ${to}, TempPassword: ${tempPassword}`,
    );
    return;
  }

  const resend = new Resend(resendApiKey!);
  const { error } = await resend.emails.send({
    from: "RFC Mentor Connect <onboarding@resend.dev>",
    replyTo: "alifiyab@rfcfertility.com",
    to,
    subject,
    html,
  });

  if (error) {
    throw new Error(`[email] Resend error: ${error.message}`);
  }
}
