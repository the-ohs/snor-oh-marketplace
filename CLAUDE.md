# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # next dev on http://localhost:3000
npm run build    # next build (type-checks as part of build)
npm run start    # serve production build
npm run lint     # next lint
```

There is no test runner configured. Type-checking happens via `next build` (strict mode in `tsconfig.json`).

Deploy: `vercel --prod` (env vars must mirror `.env.example` in Vercel project settings).

## Architecture

Next.js 15 App Router + React 19, TypeScript strict, Tailwind. Path alias `@/*` maps to the repo root.

**Data plane**: Supabase Postgres (table `packages`) + Supabase Storage (bucket `packages`, public). Schema in `supabase/migrations/0001_init.sql`. The migration is also embedded inline in `app/api/admin/bootstrap/route.ts` so a fresh deploy can self-provision via `POST /api/admin/bootstrap` (auth: `Authorization: Bearer $ADMIN_TOKEN`).

**Rate limiting**: Upstash Redis via `ioredis` (`lib/ratelimit.ts`). Per-IP daily buckets keyed `snoroh:{upload|download}:{ipHash}:{dayBucket}`. IP is SHA-256 hashed with `IP_HASH_SALT` before it touches Redis or Postgres — never store raw IPs.

**Supabase clients** (`lib/supabase.ts`): two singletons.
- `supabaseService()` — service-role key, bypasses RLS. Used by all write paths and admin routes.
- `supabaseAnon()` — anon key, RLS-bound. Used for public GET endpoints (gallery list, preview).
- Env resolution falls through several aliases (`NEXT_PUBLIC_SUPABASE_URL` → `SUPABASE_URL` → `snoroh_*` variants); preserve this order when editing — Vercel integrations inject the prefixed variants.

**Package format** (`lib/schema.ts`, `lib/validate.ts`):
- Both `.snoroh` and `.animime` share one JSON schema. The extension is branding only; format is inferred from the uploaded filename.
- Two versions coexist: v1 embeds one base64 PNG per status (all 7 of `STATUSES` required); v2 uses `smartImportMeta.sourceSheet` (single sprite sheet + `frameInputs` ranges). `validatePackage` dispatches on `version`.
- Validation enforces: ≤3 MiB file, PNG magic bytes on every sprite, `sharp` metadata decode, ≤8192px per side, 1–64 frames per status (v1).
- Preview stored as base64 in `packages.preview_png` column; served as PNG by `/api/packages/:id/preview`.

**API routes** (all `runtime = "nodejs"` — `sharp` and `pg` require Node, not Edge):
- `POST /api/upload` — multipart, rate-limited (5/day/IP), validates, uploads blob to Storage, inserts DB row. On DB failure, the storage object is rolled back via `storage.remove()`.
- `GET /api/packages` — cursor-paginated (ISO `created_at`, 24/page, max 48). Fetches `limit+1` to compute `nextCursor`.
- `GET /api/packages/:id/download` — rate-limited (100/day/IP), streams blob with `content-disposition`.
- `GET /api/packages/:id/preview` — serves cached PNG from the DB column, not from Storage.
- `DELETE /api/admin/packages/:id` — requires `Bearer $ADMIN_TOKEN`; removes blob then row.
- `POST /api/admin/bootstrap` — idempotent DB migration + bucket creation. Sets `NODE_TLS_REJECT_UNAUTHORIZED=0` at module scope because Supabase's non-pooling Postgres cert chain isn't in Node's default trust store — do not remove without an alternative fix.
- `DELETE /api/admin/ratelimit?kind=upload|download|all` — SCAN+DEL Redis keys matching `snoroh:*`.

**Admin auth**: every admin route rejects when `ADMIN_TOKEN` is unset or equals `"changeme"`. Match this pattern when adding new admin endpoints.

**Frontend** (`app/page.tsx` → `gallery.tsx` + `upload-form.tsx`): single-page gallery with client-side infinite scroll against `/api/packages`. `app/install-fallback.tsx` handles the `snoroh://install?id=...` deeplink flow (see `lib/deeplink.ts`) when the desktop app isn't installed. `page.tsx` is `force-dynamic` so the gallery always fetches fresh.

## Conventions

- New API routes: always export `runtime = "nodejs"`; return errors as `{ error: { code, message } }` with matching HTTP status (see `err()` helper pattern in `upload/route.ts`).
- When touching rate-limit keys, keep the `snoroh:` prefix — the admin reset endpoint SCANs on it.
- When touching storage paths, they are UUID-keyed with the format extension (`crypto.randomUUID()}.${ext}`). The DB `storage_path` column has a unique constraint.
