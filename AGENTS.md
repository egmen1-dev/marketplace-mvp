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

## Minimum supported version (EPIC 83+)

Closed Alpha support baseline:

```text
minimumSupportedVersionCode = 3  (0.1.2-alpha)
```

Clients below minimum receive `UNSUPPORTED_CLIENT` and must upgrade. Prototype `0.1.0-alpha` and transitional `0.1.1-alpha` are not supported.

## Release lifecycle (mandatory from 0.1.2)

Every Closed Alpha release MUST follow:

```text
build → publish → MRP → update available → install → telemetry → adoption % → rollout → rollback
```

Gate: `npm run mobile:epic-83:gate`

## Testing expectations

Before marking a mobile EPIC accepted:

```bash
npm run build
cd apps/mobile && npm run typecheck
npm run mobile:release-gate
npm run mobile:closed-alpha:gate   # when EPIC touches Alpha release
npm run mobile:epic-83:gate        # when EPIC touches minimum supported / boot pipeline
```

Physical Android acceptance cannot be fully automated in cloud — document `NOT_RUN` honestly when operator pass is pending.

## Current Alpha baseline

| Field | Value |
|-------|-------|
| Version | `0.1.2-alpha` |
| versionCode | `3` |
| Minimum supported | `0.1.2-alpha` (code 3) |
| Download | [GitHub Release](https://github.com/egmen1-dev/marketplace-mvp/releases/tag/closed-alpha-0.1.2) |
| EPIC | EPIC 83 — Minimum Supported Version (published) |

See `docs/mobile/EPIC_83_MINIMUM_SUPPORTED_VERSION.md` for the active gate matrix.
