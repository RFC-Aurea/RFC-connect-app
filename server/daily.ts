const DAILY_API_KEY = process.env.DAILY_API_KEY;
const DAILY_API_BASE = "https://api.daily.co/v1";

export const dailyEnabled = !!DAILY_API_KEY;

if (!dailyEnabled) {
  console.warn("[daily] DAILY_API_KEY not set — video call rooms cannot be created");
}

export interface DailyRoom {
  url: string;
  name: string;
  exp: number;
}

async function dailyFetch(path: string, init: RequestInit): Promise<Response> {
  if (!DAILY_API_KEY) {
    throw new Error("DAILY_API_KEY is not configured");
  }
  const res = await fetch(`${DAILY_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${DAILY_API_KEY}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  return res;
}

/**
 * Create a Daily.co room for a mentor/patient assignment. Returns the room
 * URL, name, and expiration time (unix seconds).
 *
 * `expSeconds` is the unix timestamp at which the room auto-expires. Pass
 * `Math.floor(scheduledAt.getTime() / 1000) + 3600` for scheduled calls, or
 * leave undefined to default to 1 hour from now (good for instant calls).
 */
export async function createDailyRoom(
  assignmentId: number,
  expSeconds?: number,
): Promise<DailyRoom> {
  const exp = expSeconds ?? Math.floor(Date.now() / 1000) + 3600;
  const name = `rfc-assignment-${assignmentId}-${Date.now()}`;

  const res = await dailyFetch("/rooms", {
    method: "POST",
    body: JSON.stringify({
      name,
      properties: {
        exp,
        enable_chat: false,
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Daily createRoom failed (${res.status}): ${text}`);
  }

  const room = (await res.json()) as { url: string; name: string };
  return { url: room.url, name: room.name, exp };
}

export async function deleteDailyRoom(roomName: string): Promise<void> {
  if (!dailyEnabled) return;
  try {
    const res = await dailyFetch(`/rooms/${encodeURIComponent(roomName)}`, {
      method: "DELETE",
    });
    // 404 is fine — room already gone or expired.
    if (!res.ok && res.status !== 404) {
      const text = await res.text();
      console.error(`[daily] deleteRoom failed (${res.status}): ${text}`);
    }
  } catch (err) {
    console.error("[daily] deleteRoom error:", err);
  }
}
