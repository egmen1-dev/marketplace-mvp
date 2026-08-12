export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { registerMonitoring } = await import("@/lib/monitoring/register");
    registerMonitoring();
  }
}
