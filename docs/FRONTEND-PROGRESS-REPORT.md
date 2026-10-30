# Ordershed — Frontend progress report

Status as of 22-10-2026 · Build v0.1.0 (sandbox) · Frontend complete, backend next

## Summary

The full frontend for all three roles is complete and deployable. It covers 58 screens and states:

- **Buyer desktop:** 25 screens.
- **Supplier:** 15 phone screens and 3 laptop screens.
- **Admin console:** 8 screens.
- **Entry pages:** sign-in, buyer sign-up & KYB, self-serve Get a quote.
- **List states:** empty, loading and error, for every list.

All of it follows the "SAP-grade, but beautiful" design direction. Every screen runs on a fictional sandbox dataset through a typed API layer, so the backend can plug in later without changing any screen.

The 11 screens the canvas review asked for are all included:

- Buyer sign-up & KYB
- Compare quotes with landed-cost drawer
- GRN
- Masked call
- Transport RFQ
- Supplier Orders & chat
- Supplier dispatch cross-check
- Admin console screens
- Empty, loading and error states

Screenshots: `docs/screenshots/` (58 PNGs, retina, at the design sizes 1440 × 900 desktop and 390 × 844 phone).

## What was built

### 1. Application foundation

| Area | Choice | Why |
|---|---|---|
| Framework | React 18 + TypeScript (strict) + Vite | Fast, typed, standard. Strict mode keeps errors out. |
| Routing | React Router, lazy-loaded per role | Buyer, Supplier and Admin each download only their own code |
| Data | TanStack Query + typed API client | Caching, retries and loading/error states handled the same way everywhere |
| API modes | `mock` (in-browser sandbox) or `http` (real backend) | Screens never change when the backend arrives |
| Styling | Token-based CSS design system, no UI library | Matches the design spec exactly; no generic SaaS look |
| Fonts | Archivo, Public Sans, IBM Plex Mono, self-hosted | No third-party calls; works offline and under a strict CSP |
| Tests | Vitest, 16 unit tests | Money maths, three-way match, DoA routing, command-bar grammar |

### 2. Design system ("SAP-grade, but beautiful")
- **Look:** light theme with the exact palette from the design spec.
  - Colours: ink #111418, accent #1F4FD8, good / warning / critical.
  - Shape: 4 px radius, 1 px rules.
  - Never used: gradients, shadows, emoji or illustrations.
- **Type:** Archivo for titles and uppercase section labels; Public Sans for body; IBM Plex Mono for every number, ID, GSTIN and date.
- **Desktop shell (Buyer and Admin):**
  - 224 px sidebar, grouped navigation with counts.
  - 48 px top bar with:
    - scoped search (Orders · Vendors · Materials · Invoices · RFQs)
    - query tracker
    - alerts
    - user chip
  - Dark footer bar with keyboard hints, environment, plant and region.
- **Phone shell (Supplier):** 390 × 844, four tabs (Open items · Quote · Catalogue · Orders), 44 px touch targets, profile done once.
- **Keyboard-first:**
  - `/` or `Ctrl K` opens the command bar.
  - The command bar works like SAP transaction codes: `RFQ 123`, `PO 456`, `vendor hosur`, `new rfq`.
  - In tables: `J` / `K` move, `Enter` opens, `X` selects, `Esc` closes panels.

### 3. Shared components (drawn once, reused everywhere)
- **Dense data table.** Fixed header, 34 px rows, right-aligned mono numbers, units in headers. It also handles:
  - sorting, filtering and a column chooser
  - saved layout per user
  - bulk select with bulk actions
  - CSV export
  - expandable rows
  - built-in empty, loading and error states
- **Status chip.** Always a word plus a colour.
- **Source tag on every number:** Supplier · HTS · Freight quote · Computed · History. The number component will not compile without a source.
- **"Proposed by AI" box.** Dashed border, confidence chip, Approve / Edit. Below 0.75 confidence it says a person must confirm. Nothing is sent until approved.
- **Domain components:**
  - check-list row
  - commitment card (owner, item, due, one button)
  - document flow panel (vertical and horizontal)
  - DoA approver strip
  - sealed-bid hash line
- **Layout and navigation:** side panel / drawer, phone bottom sheet, command bar.
- **Data display:** KPI tiles with sparklines, field labels that show the technical name on hover, and "Last changed by / at" on records.

### 4. Screens by role

**Entry**

| # | Screen | Notes |
|---|---|---|
| 00 | Screen index | Every screen, grouped by role, for reviewers |
| 01 | Sign in | Buyer: email OTP or Microsoft SSO · Supplier: WhatsApp OTP, GSTIN as org key · Admin: passkey |
| 02 | Buyer sign-up & KYB | One field at a time. Country picks the ID type: GSTIN/PAN, Handelsregister, EIN, Companies House or UAE licence. Register lookup, then plants, then M365 |
| 03 | Get a quote (self-serve) | Upload a drawing, AI read-back, indicative band with source, hand-over to Create request |

**Buyer (desktop)**

| # | Screen | What it answers |
|---|---|---|
| 10 | Home | What needs me today? Three key numbers (quotes/RFQ, reply time, cost/RFQ) plus open PO value, decisions, commitments due, RFQs in flight, payments on hold |
| 11 | Create request | Did we read the drawing right? Drawing with numbered source-span markers next to extracted fields (value, unit, confidence, source). Fields below 0.75 must be confirmed before suppliers see anything. Also shows should-cost band, quantity & terms, similar parts |
| 12 | Find vendors | Who can make it? Ranked list with filters: Your vendors · Network · Performance-verified · Within 150 km. Shows verification tier, invite list and a preview of the WhatsApp message (buyer name hidden) |
| 13–14 | RFx list and RFQ view | Status tabs, bulk reminders. Document flow, sealed-period banner, supplier status with sealed hash per quote, queries, documents |
| 15–16 | Compare quotes + landed-cost drawer | EXW, tooling and normalised price, each source-tagged. Position against the should-cost band. Landed cost to Stuttgart in EUR, every line sourced. Self-declared and outlier quotes flagged, not hidden |
| 17 | Award & decision pack | Recommendation, the full decision-pack checklist, DoA strip (L2: Buyer then Purchase head), what happens on approval, document flow |
| 18 | Reverse auction (Phase 2) | Rank-only lots, auto-extension, pause; marked as Phase 2 |
| 19 | Commitments | Board or list. Owner, due date, reminder count. Two reminders, then an ops task |
| 20–21 | Queries & chat, Masked call | Tracked supplier questions with an AI-drafted answer to approve. Masked call with recording notice and AI summary to approve |
| 22 | Orders | List and detail side by side: PO lines with HSN/GST, progress, document flow RFQ → PO → ACK → ASN → GRN → INV, open commitments |
| 23 | Shipments | Dispatch cross-check (quantity, HSN, GSTIN, value, Incoterm, consignee) with a blocked example and an AI-drafted fix message |
| 24 | Transport RFQ | Carrier bids with freight source tags |
| 25 | Goods receipt | Shipped vs received vs accepted vs rejected; AI-drafted debit note |
| 26 | Payments | Three-way match per invoice (quantity, price, HSN, tax) computed in code, held invoices, MSME due dates |
| 27–29 | Vendor list, Vendor view, Onboarding review | Tier kept separate from rank; performance, certificates, four-eyes approve/block |
| 30–31 | Material master, Docs library | ERP mapping, price history, single-source flag, Material Data File; domestic and export document packs with link to PO line |
| 32–33 | Intelligence, CPO report | Price index by part family with WPI overlay, import-substitution scan; savings vs last price and vs should-cost |
| 34–35 | Audit log, Settings & DoA | Hash-chained events with "chain verified" banner; DoA, plants, users & roles, SLAs, integrations, all versioned |
| 36 | Command bar | Jump to any numbered document |
| 37–39 | Empty, loading, error states | Shown on Orders, RFx and Payments; available on every list |

**Supplier (phone, with WhatsApp parity)**

| # | Screen | Notes |
|---|---|---|
| 50–51 | Join, Join approved | GSTIN fetches legal name, trade name, address and status, with checks. Then WhatsApp OTP and business-type chips. Language picker: English, Tamil, Hindi, Kannada, Telugu. "Send JOIN to …" |
| 52–53 | Profile + set-up pages | Single profile screen with six rows: Business, Products & codes, Capabilities & proof, Your page, Export roadmap, Benefits (always "confirm with your CA") |
| 54 | Open items | One list of everything waiting on the supplier |
| 55–57 | Quote, voice quote, decline | Five fields, private floor price, voice note turned into a confirmation card, decline sheet, sealed hash on submit |
| 58 | Catalogue | PDF, photo or Excel read into product rows in a proposed state with confidence |
| 59–60 | Orders, Orders & chat | Debit-note conversation, voice-note transcript, Accept / Raise an issue |
| 61 | Dispatch cross-check | Six checks, one failing with the exact fix, "Fix and resend" |
| 62 | WhatsApp flow | JOIN, new RFQ (Quote · Decline · Ask), voice quote confirmation, sealed receipt, cross-check result |
| 63–65 | Laptop: Job board, Job pack, My work | Same data and actions as the phone app |

**Admin console**

| # | Screen | Notes |
|---|---|---|
| 70 | Ops home | What is stuck, by severity and age; MVP targets against actuals |
| 71 | Verification queue | Evidence checklist, four-eyes first and second reviewer |
| 72 | RFQ operations | Low-quote alerts, nudges, Phase A manual mode |
| 73 | Supplier directory | Tiers and activity; admin sees every price, edits none |
| 74 | Buyer organisations | Each buyer company's plan, company verification (KYB) status, free-trial end date (first PO or 60 days), and what an RFQ costs us to run in AI and messaging, shown in red above ₹ 150 |
| 75 | Messaging & templates | Meta and DLT status, delivery, read and reply rates, rejected-template alert |
| 76 | Cost & models | Metering per RFQ; eval suites (accuracy, calibration, cost per document, p50 latency) with a ship gate |
| 77 | Disputes & audit | Open disputes, admin events with hashes |

### 5. Product rules built into the code
- **Money in code.** Normalised price, landed cost (EXW + tooling allocation + freight + insurance + duty on CIF + brokerage), savings, should-cost band, three-way match and DoA level are pure functions in `src/lib/costing.ts`, with tests. The UI only displays their results.
- **Every number sourced.** A number without a source tag cannot be rendered by the `Num` component.
- **People approve.** AI output appears only in proposal boxes that need a tap.
- **Privacy:**
  - Buyer name is hidden in supplier-facing views and WhatsApp until award.
  - The floor price field says it is private and never used for ranking.
  - Admin can change tier, never rank.
- **Audit:** every record shows "Last changed by / at"; audit events show the previous and current hash.
- **No employer data:** all companies, people and numbers in the sandbox are fictional.

### 6. Quality checks
- TypeScript strict: 0 errors.
- Unit tests: 16 of 16 pass.
- Production build: about 66 KB gzipped shared vendor code. Each role's screens load separately; the largest role chunk is about 28 KB gzipped.
- Screenshots: all 58 are captured automatically by `npm run screenshots`, so they can be refreshed after any change.

### 7. Deployable on AWS
- **S3 + CloudFront (recommended for the web app):** `infra/aws/frontend.yaml`.
  - Private, encrypted and versioned S3 bucket in ap-south-1.
  - CloudFront with Origin Access Control and HTTP/2 + HTTP/3.
  - Security headers: HSTS, CSP limited to our own origin and the API, frame-deny.
  - SPA routing, access logs, optional custom domain with ACM.
- **CI/CD:** `.github/workflows/frontend.yml`.
  - Typecheck, test and build on every PR.
  - Deploy on merge to `main` through GitHub OIDC; no stored AWS keys.
  - Long-cache hashed assets, no-cache `index.html`, CloudFront invalidation.
- **Container option:** `apps/web/Dockerfile` (multi-stage, unprivileged nginx, health check) for ECS Fargate behind an ALB if we want web and API on one platform.

## How to see it
- **Run locally:** `npm install && npm run dev`, then open http://localhost:5173 to get the screen index.
- **Review list states:** add `?demo=empty`, `?demo=loading` or `?demo=error` to any list URL.

## Current limits (by design, until the backend is connected)
- Sandbox data only. Buttons that would change data (approve, send, submit) show the right UI state but do not save. They will call the backend once the APIs exist.
- Sign-in screens are designed but not yet connected to an identity provider.
- Interface text is English only; the language picker is in place.
- Production code timing still depends on the advocate's review date (see PROJECT CONTEXT).
