import { describe, expect, it, beforeEach } from "vitest";

import { buildAppShellReadinessReport } from "@/lib/mobile/app-shell-readiness";
import { runReleaseReadinessCheck } from "@/lib/mobile/release-readiness";

describe("mobile shell readiness", () => {
  beforeEach(() => {
    process.env.CCOS_ENABLED = "true";
    process.env.CCOS_GRAPH_PLATFORM_ENABLED = "true";
    process.env.CCOS_TWIN_PLATFORM_ENABLED = "true";
    process.env.MARKETPLACE_COGNITIVE_PLATFORM_ENABLED = "true";
  });

  it("reports APP_SHELL_READY YES when hard checks pass", () => {
    const mobile = runReleaseReadinessCheck();
    const shell = buildAppShellReadinessReport();
    expect(mobile.ready).toBe(true);
    expect(shell.status).toBe("YES");
    expect(shell.blockers).toHaveLength(0);
  });
});
