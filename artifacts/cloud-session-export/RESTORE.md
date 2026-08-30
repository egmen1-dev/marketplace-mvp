# LOT Cloud Session Export — Restore on Mac

## Files

| File | Size | SHA256 |
|------|------|--------|
| `lot-cloud-session.patch` | 126 796 bytes | `7aacc32015f394de10209a4e232ec583b71f7ae1954181efeec6a218b0ef2029` |
| `lot-cloud-session-untracked.tar.gz` | 6 648 145 bytes | `ed78e1e2adfb25eb7f14b7da0dca4f6c122391e8cd496748080a7d5689af89f7` |

## Restore steps

```bash
cd /Users/macbookair/marketplace-mvp

# 1. Apply tracked changes
git apply --3way /path/to/lot-cloud-session.patch

# 2. Extract untracked new files (preserves paths from repo root)
tar -xzf /path/to/lot-cloud-session-untracked.tar.gz -C .

# 3. Verify
git status --short
cd apps/mobile && npm run typecheck
```

## Session metadata

- **Branch:** `cursor/firebase-test-lab-instrumentation-12fd`
- **HEAD:** `9cbc354140c8fb736ccc6f86a7ff874bdc7ed55b`

## Download

Both files are in this folder (`cloud-session-export/`).
