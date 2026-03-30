import nodemailer from "nodemailer";
import { promises as dns } from "dns";

const smtpUser = process.env.SMTP_USER;
const smtpAppPassword = process.env.SMTP_APP_PASSWORD;

export const emailEnabled = !!(smtpUser && smtpAppPassword);

let transporter: nodemailer.Transporter | null = null;

if (emailEnabled) {
  transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: smtpUser!,
      pass: smtpAppPassword!,
    },
  });
} else {
  console.warn(
    "[email] SMTP_USER or SMTP_APP_PASSWORD not set — " +
      "email sending disabled. Set both env vars to enable.",
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

export async function sendWelcomeEmail(params: {
  to: string;
  name: string;
  role: string;
  username: string;
  tempPassword: string;
}): Promise<void> {
  const { to, name, role, username, tempPassword } = params;
  const roleDisplay = role.charAt(0).toUpperCase() + role.slice(1);

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to RFC Mentor Connect</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f4;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f4;padding:20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;max-width:600px;">
          <!-- Header -->
          <tr>
            <td style="background-color:#2563eb;padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">RFC Mentor Connect</h1>
              <p style="margin:8px 0 0;color:#bfdbfe;font-size:14px;">Rejuvenating Fertility Center</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <h2 style="margin:0 0 16px;color:#1e293b;font-size:20px;">Welcome, ${name}!</h2>
              <p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.6;">
                Your account has been created on RFC Mentor Connect. Here are your login details:
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;margin-bottom:24px;">
                <tr>
                  <td style="padding:16px 20px;">
                    <p style="margin:0 0 10px;color:#64748b;font-size:13px;"><strong style="color:#1e293b;">Role:</strong> ${roleDisplay}</p>
                    <p style="margin:0 0 10px;color:#64748b;font-size:13px;"><strong style="color:#1e293b;">Username:</strong> ${username}</p>
                    <p style="margin:0;color:#64748b;font-size:13px;"><strong style="color:#1e293b;">Temporary Password:</strong> <span style="font-family:monospace;background-color:#e2e8f0;padding:2px 6px;border-radius:3px;">${tempPassword}</span></p>
                  </td>
                </tr>
              </table>
              <h3 style="margin:0 0 12px;color:#1e293b;font-size:16px;">Getting Started</h3>
              <p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.6;">
                Download the RFC Mentor Connect app, sign in with your email and temporary password, and you'll be guided through setting up your phone verification and creating a new password.
              </p>
              <p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.6;">
                If you have questions, contact your RFC clinical team.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color:#f8fafc;padding:20px 40px;text-align:center;border-top:1px solid #e2e8f0;">
              <p style="margin:0;color:#94a3b8;font-size:12px;">© 2026 Rejuvenating Fertility Center</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  if (!emailEnabled || !transporter) {
    console.log(
      `[email] Dev mode — would send welcome email to ${to}:\n` +
        `  Subject: Welcome to RFC Mentor Connect\n` +
        `  Role: ${roleDisplay}, Username: ${username}, TempPassword: ${tempPassword}`,
    );
    return;
  }

  await transporter.sendMail({
    from: smtpUser!,
    to,
    subject: "Welcome to RFC Mentor Connect",
    html,
  });
}
