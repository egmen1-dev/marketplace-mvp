# EPIC — Android Self-Update V2 Physical Checklist

Use after `PRE_PHYSICAL_V3=PASS` and new immutable RC build.

## Bootstrap (if needed)

- [ ] **A** Manual browser bridge RC10.5 → fixed RC (proxy URL, install over existing, no uninstall)

## Self-update proof (critical)

- [ ] **B** Fixed RC installed → update check clean state (`NO_UPDATE` or `UPDATE_AVAILABLE` as expected)
- [ ] **C** Next update → download progress visible (`%` or MB)
- [ ] **D** SHA verification stage visible (`Проверяем целостность…`)
- [ ] **E** Android installer opens
- [ ] **F** Install succeeds without uninstall
- [ ] **G** About shows expected version/code
- [ ] **H** Update check after install → `NO_UPDATE`

**Key proof:** `OLD_FIXED_RC → IN_APP_UPDATE → NEW_RC`

## Seller journey (no regression)

- [ ] **I** Seller photo Continue — one tap
- [ ] **J** Seller Submit → `PENDING_REVIEW`
- [ ] **K** My Lots consistency
- [ ] **L** About → Copy diagnostics includes update journey V2 events

## Evidence to capture

- Screenshot pack per stage (download %, verifying, installer, About version)
- Diagnostics export with `actionId` correlation
- Verdict: `PHYSICAL_ANDROID_PROOF=PASS|FAIL`
