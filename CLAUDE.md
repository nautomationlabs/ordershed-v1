# CLAUDE.md

Source of truth for scope: PROJECT CONTEXT (kept by the founder). Where code and context differ, the context wins.

## Non-negotiables (check every change against these)
- Agents propose, people approve. AI output renders in `AiProposal`; nothing is sent or saved without a human tap.
- Every number has a source. Use `Num` / `SourceTag`; never render a bare price, total, duty or landed cost.
- Money is computed in code (`apps/web/src/lib/costing.ts` now, the backend later), never by a model. Add a test for every formula.
- Buyer A's data never reaches Buyer B. Supplier floor prices are private. Other suppliers' bids are never shown. Buyer names and contacts are hidden from suppliers until award.
- Ranking is never sold. Admin can change a verification tier, never a rank.
- Outreach data (Apollo, trade data) is for our outreach only.
- Nothing from any employer, past or present. Test data is fictional or public.
- Every admin action, approval, send and document goes to the hash-chained audit log (72 months).
- Keep Decibyl out of this repo.

## Design system
Light theme only. Tokens in `apps/web/src/styles/tokens.css`. Archivo (titles, labels, primary buttons), Public Sans (body), IBM Plex Mono (numbers, IDs, dates). Flat, 1 px rules, 4 px radius, no gradients, shadows, emoji or decorative icons. One primary button per screen, top-right; secondary actions are text links. Status chip = word + colour. Dense tables (`DataTable`) are the primary surface.

## Conventions
- Screens live in `apps/web/src/features/<role>/`; they fetch only through `src/api/client.ts` hooks.
- Domain types in `src/api/types.ts` are the API contract. Change them with the backend, not around it.
- Documents are numbered `RFQ-000123`, `PO-000456`, `ASN-…`, `GRN-…`, `INV-…`, `MAT-…`; every document line links to a PO line.
- Every list handles empty, loading and error (`DataTable` does this; check with `?demo=`).
- Dates shown DD-MM-YYYY in IST; INR uses Indian grouping.

## Commands
`npm run dev` · `npm test` · `npm run typecheck` · `npm run build` · `npm run screenshots`

## Needs founder approval (label `needs-founder`)
Migrations, login and approval paths, secrets, spend, production deploys.
