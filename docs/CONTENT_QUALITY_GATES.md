# Content Quality Gates

Hard gates block **TOP eligibility** in advisory ranking intelligence when content quality is enabled.

## Hard gate codes

| Code | Trigger (examples) |
|------|---------------------|
| `NO_RELEVANT_MAIN_PHOTO` | No photos / irrelevant primary |
| `PRODUCT_IDENTITY_MISMATCH` | Different products across photos |
| `PROHIBITED_PRODUCT` | Trust Loop prohibited hit |
| `MODERATION_REJECTED` | Moderation rejected |
| `SERIOUS_TEXT_IMAGE_CONTRADICTION` | e.g. 16л vs 12л conflict |
| `IRRELEVANT_CONTENT` | Photo relevance ≈ 0 |
| `INVALID_PRODUCT_INFORMATION` | Reserved for severe data invalidity |

## Not hard gates

Cosmetic issues (weak background, mild crop) affect score and recommendations only.

## Promotion

Promotion **cannot** bypass a failed content quality gate in advisory ranking lab paths.

## Low confidence

Do not auto-punish sellers on low-confidence AI signals — hard actions remain with Trust/Moderation policy.

## Dirty socks control

Benchmark scenario `dirty-socks-product-control` must produce:

- Photo relevance ≈ 0
- Quality gate FAIL
- TOP eligibility BLOCKED
