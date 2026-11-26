# Security & Architecture Summary (`1–3–6–24`)

Dijital Evrenim is a local-first web application backed by IndexedDB (`schemaVersion: 3`) with an optional Express proxy for Gemini AI assistance. Following the **1–3–6–24** architectural update (3 Main Domains, 6 Thematic Centers, 24 Functional Modules), all security safeguards, non-destructive schema migrations, and cross-module data flows were re-verified.

## Key Safeguards Verified

1. **Non-Destructive `v2 -> v3` Schema Migration (`ecosystemRepository.ts`)**
   - Migrates `tarih-simulatoru` records and cross-module relations into the unified `tarih-atlasi` module while keeping `isFictionalSimulation: true` separation explicit.
   - Replaces legacy `centers_overview` dashboard widget config with `domains_overview` and moves `automusicpro` into the `atolye` center.
   - Preserves any existing user records for the 5 retired modules (`hatiralarim`, `soy-agacim`, `zeka-pro-ligi`, `bilge-akademi`, `deneme-analiz`) in IndexedDB and allows exporting them via `exportAll('legacy_archive')`, while filtering retired modules out of active search, calendar, and integrations.

2. **Safe File Attachments & Validated External URLs**
   - `isSafeDataUrl` restricts uploads and restored attachments to safe base64 image (`png`, `jpeg`, `jpg`, `webp`, `gif`), PDF, plain/CSV/JSON text, and audio types, blocking inline HTML/SVG payloads.
   - `isSafeHttpUrl` restricts external app repository, live, and API URLs to `http://` and `https://`.

3. **Server-Side AI Proxy Validation & Security Headers (`server.ts`)**
   - `/api/ai/assist` validates incoming JSON fields, length limits, and `'user' | 'model'` role allowlists, keeps `GEMINI_API_KEY` server-only, and serves `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, and `X-Frame-Options: SAMEORIGIN`.

4. **Scoped Backup Restore, Referential Integrity, & Safe Parsers**
   - Single-module `replace` restores isolate modifications to that module without wiping unrelated IndexedDB stores; book/quote/record deletions clean up dangling collection and attachment references.
   - `evaluateMathExpression` uses a strict recursive-descent parser with malformed-input rejection, and `searchEcosystem` / `buildCalendarEvents` enforce active-module and private-domain boundaries.

---

## Verification

| Verification Check | Command / Tool | Result | Coverage |
| :--- | :--- | :--- | :--- |
| Automated Unit & Architecture Tests | `npx tsx --test src/core/__tests__/core.test.ts` | **11 / 11 passed** | `1–3–6–24` registry counts (3 domains, 6 centers, 24 modules, 12 external apps), retired-module exclusion in search & calendar, `isSafeHttpUrl`, `isSafeDataUrl`, math expression validation, solar time formatting, CSV parsing, Turkish prosody, truth tables. |
| TypeScript Typecheck | `npm run lint` (`tsc --noEmit`) | **Passed (0 errors)** | Full client, core repository/services, store, and server TypeScript types. |
| Production Bundle Build | `npm run build` | **Succeeded** | Complete Vite production build across all routes and modules. |
