import twilio from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

export const twilioEnabled = !!(accountSid && authToken && verifyServiceSid);

let client: ReturnType<typeof twilio> | null = null;

if (twilioEnabled) {
  client = twilio(accountSid!, authToken!);
} else {
  console.warn(
    "[twilio] TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, or TWILIO_VERIFY_SERVICE_SID not set — " +
      "SMS verification disabled. Set all three env vars to enable.",
  );
}

export async function sendVerificationCode(phone: string): Promise<void> {
  if (!client || !verifyServiceSid) throw new Error("Twilio not configured");
  await client.verify.v2.services(verifyServiceSid).verifications.create({
    to: phone,
    channel: "sms",
  });
}

export async function checkVerificationCode(
  phone: string,
  code: string,
): Promise<boolean> {
  if (!client || !verifyServiceSid) throw new Error("Twilio not configured");
  const check = await client.verify.v2
    .services(verifyServiceSid)
    .verificationChecks.create({ to: phone, code });
  return check.status === "approved";
}
