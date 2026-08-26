# LOT Marketplace Policy Research

**Policy pack:** `LOT_POLICY_V2`  
**Researched at:** 2026-08-26  
**Jurisdiction:** Russian Federation (RU)  
**Status:** Foundation complete — shadow validation only; **not** ready for `GUARDED_AUTO` enforcement

This document records primary-source legal research and marketplace benchmarks used to build `config/policies/lot-policy-v2.json`. Claims without a listed source are marked **UNVERIFIED** and are not encoded as hard rules.

---

## Official / legal sources

| Source | URL | Date checked | Notes |
|--------|-----|--------------|-------|
| ФЗ-15 (табак / никотин / дистанционная продажа) | http://pravo.gov.ru/proxy/ips/?docbody=&nd=102074277 | 2026-08-26 | ст. 19 — запрет дистанционной розничной продажи табака, никотинсодержащей продукции, устройств для её потребления |
| ФЗ-149 (блокировка сведений о дистанционной продаже табака) | http://pravo.gov.ru/proxy/ips/?docbody=&nd=102074277 | 2026-08-26 | нормы о блокировке информации; вступление отдельных положений — с 2026-03-01 |
| ФЗ-3 (наркотические / психотропные вещества) | http://pravo.gov.ru/proxy/ips/?docbody=&nd=102074277 | 2026-08-26 | запрет оборота наркотиков и прекурсоров |
| ФЗ-61 (лекарственные средства) | http://pravo.gov.ru/proxy/ips/?docbody=&nd=102074277 | 2026-08-26 | дистанционная продажа рецептурных ЛС ограничена; маркетплейс без аптечной лицензии — HARD_BLOCK для RX |
| ФЗ-171 (алкоголь) | http://pravo.gov.ru/proxy/ips/?docbody=&nd=102074277 | 2026-08-26 | алкоголь требует лицензии и спецканала; LOT — HARD_BLOCK |
| ФЗ «Об оружии» | http://pravo.gov.ru/proxy/ips/?docbody=&nd=102074277 | 2026-08-26 | огнестрельное — HARD_BLOCK; холодное — классификация / RESTRICTED_REVIEW |
| ФЗ-152 (персональные данные) | http://pravo.gov.ru/proxy/ips/?docbody=&nd=102074277 | 2026-08-26 | продажа баз ПДн — HARD_BLOCK |
| ФЗ-436 (защита детей) | http://pravo.gov.ru/proxy/ips/?docbody=&nd=102074277 | 2026-08-26 | возрастные ограничения, adult content |
| Росздравнадзор (медизделия) | https://roszdravnadzor.gov.ru/ | 2026-08-26 | регистрация медизделий — RESTRICTED_REVIEW |
| Честный ЗНАК (маркировка) | https://честныйзнак.рф/ | 2026-08-26 | обязательная маркировка ряда категорий — RESTRICTED_REVIEW |

---

## Marketplace benchmarks

| Platform | Source | Date checked |
|----------|--------|--------------|
| Avito | https://www.avito.ru/legal/rules/listing-policy | 2026-08-26 |
| Wildberries seller rules (PDF) | https://seller.wildberries.ru/help/pravila-raboty/ | 2026-08-26 |
| Ozon seller restrictions | https://seller.ozon.ru/ (help / restricted categories) | 2026-08-26 |
| Яндекс Маркет | https://yandex.ru/support/marketplace/ | 2026-08-26 |

**Benchmark intent:** understand category blocks, document requirements, marking, seller-type restrictions, age limits, and reputational blocks — **not** to copy rules verbatim.

---

## Product policy matrix (summary)

Legend: **A** = allowed | **P** = prohibited | **R** = restricted / documents | **M** = manual review typical | **U** = unverified / platform-specific

| Product class | RF law | Avito | Ozon | WB | LOT proposed | Notes |
|---------------|--------|-------|------|-----|--------------|-------|
| Tobacco cigarettes | P | P | P | P | **HARD_BLOCK** | FZ-15 ст. 19 |
| Nicotine / snus / heated tobacco | P | P | P | P | **HARD_BLOCK** | FZ-15 |
| Nicotine e-liquid | P | P | P | P | **HARD_BLOCK** | only when nicotine evidenced |
| Vape liquid (composition unknown) | P/R | P | P | P | **MANUAL_REVIEW** | do not infer nicotine from title alone |
| Vape device / pod / disposable | P | P | P | P | **HARD_BLOCK** | FZ-15 |
| Vape accessory (case, charger) | U | P/R | R | P | **MANUAL_REVIEW** | accessory ≠ consumable |
| Hookah / shisha | P | P | P | P | **HARD_BLOCK** | FZ-15 |
| Alcohol beverages | P* | P | P | P | **HARD_BLOCK** | *licensed channels only |
| Alcohol-free perfume | A | A | A | A | **ALLOW** | suppress false alcohol match |
| Drugs / precursors | P | P | P | P | **HARD_BLOCK** | FZ-3 |
| Rx medicines | P | P | P | P | **HARD_BLOCK** | FZ-61 |
| OTC medicines | R | R | R | P | **RESTRICTED_REVIEW** | docs + manual |
| Dietary supplements (БАД) | R | R | R | R | **RESTRICTED_REVIEW** | registration |
| Medical devices | R | R | R | R | **RESTRICTED_REVIEW** | Росздравнадзор |
| Firearms / ammo | P | P | P | P | **HARD_BLOCK** | |
| Cold weapons | R | R | R | P | **RESTRICTED_REVIEW** | classification |
| Toy guns | A/R | M | M | M | **MANUAL_REVIEW** | misclassification risk |
| Kitchen knives | A | A | A | A | **ALLOW** | culinary context |
| Explosives | P | P | P | P | **HARD_BLOCK** | |
| Pyrotechnics | R | R | R | P | **RESTRICTED_REVIEW** | permits |
| Tasers | P | P | P | P | **HARD_BLOCK** | |
| Hazardous chemicals | P | P | P | P | **HARD_BLOCK** | |
| Counterfeit | P | P | P | P | **HARD_BLOCK** | |
| Fake documents | P | P | P | P | **HARD_BLOCK** | |
| Payment cards / CVV | P | P | P | P | **HARD_BLOCK** | |
| Personal data leaks | P | P | P | P | **HARD_BLOCK** | FZ-152 |
| Digital accounts / SIM | P | P | P | P | **HARD_BLOCK** | platform policy |
| Explicit adult content | P | P | P | P | **HARD_BLOCK** | FZ-436 |
| Intimate goods | R | R | R | R | **RESTRICTED_REVIEW** | age gating |
| Live animals | R | R | R | R | **RESTRICTED_REVIEW** | permits |
| Food | R | R | R | R | **RESTRICTED_REVIEW** | labeling / expiry |
| Children's goods | R | R | R | R | **RESTRICTED_REVIEW** | age labeling |
| Cosmetics | R | R | R | R | **RESTRICTED_REVIEW** | marking |
| Mandatory marking (ЧЗ) | R | R | R | R | **RESTRICTED_REVIEW** | |
| Services | U | P/R | P/R | P | **MANUAL_REVIEW** | LOT goods-only beta |

---

## VAPE CASE — «Жидкость для вэйпа»

| Field | Value |
|-------|-------|
| Title | `Жидкость для вэйпа` |
| Typical seller claim | «без никотина» (unverified) |
| Category | Often miscategorized under electronics |
| Image / OCR | Pixel OCR **NOT_AVAILABLE** in foundation build |
| Classification | **MANUAL_REVIEW** |
| Rules | `LOT_VAPE_LIQUID_AMBIGUOUS_V2` |
| Rationale | Remote sale of nicotine products prohibited (FZ-15); nicotine must not be inferred from title alone; composition requires moderator review |
| If nicotine evidenced (OCR / characteristics) | **HARD_BLOCK** (`LOT_NICOTINE_LIQUID_V2`) |
| If seller claims no nicotine but OCR shows nicotine | **MANUAL_REVIEW** + conflict flag |

---

## Automation verdict

| Check | Status |
|-------|--------|
| Policy research documented | PASS |
| Machine registry `lot-policy-v2.json` | PASS |
| 100+ fixtures | PASS (121) |
| Pixel image classification | **NOT_AVAILABLE** |
| Pixel OCR | **NOT_AVAILABLE** |
| Shadow mode wired | PASS (`LOT_POLICY_V2_SHADOW`) |
| **Overall** | **`NOT_READY_FOR_AUTOMATION`** |

Do **not** start RC10.5 physical release until policy shadow validation on staging shows acceptable agreement and pixel CV/OCR provider is integrated.
