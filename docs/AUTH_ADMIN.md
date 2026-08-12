# Admin access & auth operations

## Granting ADMIN role

There is **no public admin signup**. Promote users only via:

1. **Migration** (runs on deploy): `prisma/migrations/20260812180000_hotfix_ux_admin_access/`
2. **Seed** (demo + operator emails): `npm run db:seed`
3. **Script** (manual, any environment):

```bash
DATABASE_URL="postgresql://..." npx tsx scripts/grant-admin.ts
# or specific emails:
DATABASE_URL="..." npx tsx scripts/grant-admin.ts user@example.com
```

Default script targets:

- `nikitapetrovskih968@gmail.com`
- `egmen1@gmail.com`

Users must **already exist** (registered with password). The script only updates `role`.

## Auth environment (staging / production)

| Variable | Purpose |
|----------|---------|
| `AUTH_SECRET` | JWT signing — required |
| `NEXT_PUBLIC_APP_URL` | Canonical public origin — must match the URL users visit |
| `AUTH_URL` | Optional; set to the same origin if redirects/cookies misbehave |

`trustHost: true` is enabled. Still set `NEXT_PUBLIC_APP_URL` (and `AUTH_URL` on Railway) to the live domain.

## Multi-device login

Sessions use **JWT** (`strategy: "jwt"`) — independent per browser/device.

If login works on one device but not another:

1. Confirm both devices use the **same environment** (Railway staging vs Vercel prod use different databases).
2. Re-enter email/password — emails are stored lowercase; legacy mixed-case rows are normalized on migrate.
3. Ensure `NEXT_PUBLIC_APP_URL` matches the host in the address bar.
