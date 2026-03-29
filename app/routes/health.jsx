// app/routes/health.jsx
// Health check endpoint — used by Railway and uptime monitors
import db from "../db.server";

export async function loader() {
  let dbOk = false;
  try {
    await db.$queryRaw`SELECT 1`;
    dbOk = true;
  } catch {
    // DB unreachable — still return 200 so the app stays up,
    // but surface the status in the body for monitoring tools
  }

  return new Response(
    JSON.stringify({ status: "ok", db: dbOk ? "ok" : "unreachable" }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }
  );
}
