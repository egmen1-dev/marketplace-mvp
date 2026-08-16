# AGENTS.md — LOT Marketplace

Guidance for Cloud Agents and contributors working on this repository.

## Mobile hard product rules

### Rule 1 — Post-APK stabilization gate

After the first installable Alpha APK exists:

```text
if P0 > 0
or P1 > 3
→ starting a new large functional EPIC is forbidden
```

Priority order:

```text
1. Release blockers
2. Crashes / security
3. Broken core flows
4. UX
5. Performance
6. New functionality
```

### Rule 2 — Mobile UX EPIC completion

Every Mobile UX EPIC must end with:

- physical Android checklist pass attempt (`docs/mobile/EPIC_81_PHYSICAL_ACCEPTANCE_CHECKLIST.md`)
- screenshot pack
- buyer walkthrough evidence
- seller walkthrough evidence

### Rule 3 — EPIC deliverables

Every EPIC must ship:

```text
≥ 2 Product Deliverables
+
≥ 2 Release Deliverables
```

Document deliverables in the EPIC markdown file and gate script verdict matrix.

## APP-SHELL-1 hard gate

Do **not** start APP-SHELL-1 or large new mobile features until:

```text
PHYSICAL ANDROID = PASS
AND P0 = 0
AND SEAMLESS UPDATE = PASS
AND CLOSED ALPHA >= WATCH
```

## Closed Alpha channel safety

Alpha mobile builds must consume **CLOSED_ALPHA** release metadata only — never production release channels.

## Seamless updates (EPIC 82+)

Preferred update path on Android Alpha:

```text
Launch → bootstrap → update check → optional/required UI → download URL → Android installer
```

Do not force users to manually hunt APK files. In-app APK download with SHA256 verify is optional v2; browser/download-manager flow is acceptable v1.

## Testing expectations

Before marking a mobile EPIC accepted:

```bash
npm run build
cd apps/mobile && npm run typecheck
npm run mobile:release-gate
npm run mobile:closed-alpha:gate   # when EPIC touches Alpha release
```

Physical Android acceptance cannot be fully automated in cloud — document `NOT_RUN` honestly when operator pass is pending.

## Current Alpha baseline

| Field | Value |
|-------|-------|
| Version | `0.1.1-alpha` |
| versionCode | `2` |
| Previous | `0.1.0-alpha` (code 1) |
| EPIC | EPIC 82 — Closed Alpha Stabilization |

See `docs/mobile/EPIC_82_CLOSED_ALPHA_STABILIZATION.md` for the active gate matrix.
