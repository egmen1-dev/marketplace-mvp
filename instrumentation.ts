export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { registerMonitoring } = await import("@/lib/monitoring/register");
    registerMonitoring();

    if (process.env.MOBILE_AUTO_PUBLISH_CLOSED_BETA_RC2 === "true") {
      const { ensureClosedBetaRC2Published } = await import(
        "@/lib/mobile-release-platform/publish-closed-beta-rc2"
      );
      ensureClosedBetaRC2Published().catch((err) => {
        console.error("[mobile] closed beta RC2 auto-publish failed", err);
      });
    }
  }
}
