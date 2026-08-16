import { NextResponse } from "next/server";

import { ccosKnowledgeApiGuard } from "@/lib/ccos/api/guards";
import {
  getKnowledge,
  getKnowledgeTimeline,
  listVerifiedKnowledge,
  searchKnowledge,
  getKnowledgeByScope,
} from "@/lib/ccos/knowledge";

/**
 * Shared Knowledge API
 * GET /api/ccos/knowledge?q=&pack=&scopeCategory=&id=
 */
export async function GET(request: Request) {
  const blocked = ccosKnowledgeApiGuard();
  if (blocked) return blocked;

  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  const q = url.searchParams.get("q");
  const pack = (url.searchParams.get("pack") ?? "marketplace") as "marketplace";
  const scopeCategory = url.searchParams.get("scopeCategory");
  const timeline = url.searchParams.get("timeline") === "1";

  if (id) {
    const fact = getKnowledge(id);
    if (!fact) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({
      fact,
      timeline: timeline ? getKnowledgeTimeline(id) : undefined,
      advisoryOnly: true,
    });
  }

  if (q) {
    return NextResponse.json({ facts: searchKnowledge(q, pack), advisoryOnly: true });
  }

  if (scopeCategory) {
    return NextResponse.json({
      facts: getKnowledgeByScope({ pack, categoryId: scopeCategory }),
      advisoryOnly: true,
    });
  }

  return NextResponse.json({ facts: listVerifiedKnowledge(pack), advisoryOnly: true });
}
