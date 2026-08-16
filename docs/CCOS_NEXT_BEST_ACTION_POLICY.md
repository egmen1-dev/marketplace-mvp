# CCOS Next Best Action Policy

Location: `lib/marketplace-cognitive-platform/brain/v1/next-action.ts`

## Policy version

`action-policy-v1`

## Candidate sources

Content quality, behaviour signals, trust, promotion, cold-start data collection.

## Priority rules

1. **Hard blockers first** — quality gate → fix card, not promotion
2. **Severity × confidence × urgency / effort** (configurable scores)
3. **Promotion suppressed** when `decision.blockedCapabilities` includes `promotion_advice`
4. **Cold start** — recommend data collection, not fake CTR fixes

## Output

Single `nextBestAction` on report; remaining candidates in `actionCandidates` for admin drill-down.
