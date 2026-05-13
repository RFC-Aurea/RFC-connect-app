import apn from "@parse/node-apn";

const {
  APNS_KEY,
  APNS_KEY_ID,
  APNS_TEAM_ID,
  APNS_BUNDLE_ID,
} = process.env;

let provider: apn.Provider | undefined;

if (APNS_KEY && APNS_KEY_ID && APNS_TEAM_ID && APNS_BUNDLE_ID) {
  // Railway-style env vars often arrive with literal "\n" sequences instead
  // of real newlines — normalise so the .p8 key parses correctly.
  const key = APNS_KEY.replace(/\\n/g, "\n");

  provider = new apn.Provider({
    token: {
      key,
      keyId: APNS_KEY_ID,
      teamId: APNS_TEAM_ID,
    },
    production: true,
  });
} else {
  console.warn(
    "[apns] APNS_KEY / APNS_KEY_ID / APNS_TEAM_ID / APNS_BUNDLE_ID not all set — push notifications disabled",
  );
}

export interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

export async function sendPushNotification(
  deviceToken: string,
  payload: PushPayload,
): Promise<void> {
  if (!provider || !APNS_BUNDLE_ID) return;
  if (!deviceToken) return;

  const note = new apn.Notification();
  note.topic = APNS_BUNDLE_ID;
  note.alert = { title: payload.title, body: payload.body };
  note.sound = "default";
  note.pushType = "alert";
  if (payload.data) {
    note.payload = { ...payload.data };
  }

  try {
    const result = await provider.send(note, deviceToken);
    if (result.failed.length > 0) {
      for (const f of result.failed) {
        console.error("[apns] send failed:", f.device, f.status, f.response?.reason ?? f.error?.message);
      }
    }
  } catch (err) {
    console.error("[apns] send error:", err);
  }
}
