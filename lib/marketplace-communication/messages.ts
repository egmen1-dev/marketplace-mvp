import type {
  CommunicationTemplate,
  MarketplaceCommunicationCampaign,
  MessageChannel,
  PreparedMessage,
} from "./types";

/** Prepare messages from templates — not sent until human approval. */
export function prepareCampaignMessages(input: {
  campaigns: MarketplaceCommunicationCampaign[];
  templates: CommunicationTemplate[];
}): PreparedMessage[] {
  const messages: PreparedMessage[] = [];

  for (const campaign of input.campaigns) {
    const template =
      input.templates.find((t) => t.id === campaign.templateId) ??
      input.templates.find((t) => t.campaignType === campaign.type);
    if (!template) continue;

    messages.push({
      id: `msg-${campaign.id}`,
      campaignId: campaign.id,
      templateId: template.id,
      audienceKind: campaign.audience.kind,
      subject: template.subject,
      body: template.body,
      status:
        campaign.status === "READY" ? "PENDING_APPROVAL" : "DRAFT",
      channel: "IN_APP" satisfies MessageChannel,
    });
  }

  return messages;
}

export function markMessageApproved(message: PreparedMessage): PreparedMessage {
  return { ...message, status: "APPROVED" };
}

export function markMessageSent(message: PreparedMessage): PreparedMessage {
  return { ...message, status: "SENT" };
}
