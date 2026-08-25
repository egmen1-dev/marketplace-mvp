export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { registerMonitoring } = await import("@/lib/monitoring/register");
    registerMonitoring();

    const { prisma } = await import("@/lib/prisma");
    await prisma.$connect().catch((err) => {
      console.error("[instrumentation] prisma warmup failed", err);
    });

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
