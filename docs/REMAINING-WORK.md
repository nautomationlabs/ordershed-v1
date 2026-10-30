# Ordershed — What still needs to be built

Status as of 22-10-2026 · Companion to `FRONTEND-PROGRESS-REPORT.md`

The frontend is complete. What remains:

- the **backend**: services, database, events, audit
- the **integrations**: WhatsApp, calls, GST / e-invoice / e-way bill, bank verification, M365 mail, logistics
- the **AI pipeline**: extraction, matching, drafting, evals, metering
- **AWS production infrastructure**
- **wiring the frontend** to real APIs and sign-in

Milestones run one after another (M1 → M7). Per the project rules, there are no dates.

---

## 1. Recommended backend architecture (AWS Mumbai, lean)

| Layer | Recommendation | Notes |
|---|---|---|
| API | TypeScript (Fastify) service on **ECS Fargate** behind an ALB + AWS WAF | Same language as the frontend; the domain types in `apps/web/src/api/types.ts` become shared contracts |
| Workers | Same codebase, separate Fargate services reading **SQS** queues | Extraction, messaging, document generation, reminders |
| Scheduling | **EventBridge Scheduler** → SQS | Sealed-period end, reminders (two, then an ops task), certificate expiry, MSME due dates. Temporal only in Phase 2 |
| Database | **RDS PostgreSQL 16 + pgvector**, single-AZ to start, automated backups, PITR | Similar-part search, supplier capability embeddings |
| Files | **S3**: drawings, quotes, documents (SSE-KMS); separate **Object Lock (compliance mode, 72 months)** bucket for audit anchors and audit bundles | Presigned uploads from the browser |
| Identity | **Amazon Cognito**: buyer email OTP + SAML/OIDC SSO (M365), admin passkeys; supplier WhatsApp OTP via custom auth challenge | GSTIN as supplier org key; per-plant buyer roles |
| Secrets / keys | Secrets Manager, KMS | Only the founder role can change secrets (label `needs-founder`) |
| Observability | CloudWatch logs, metrics, alarms; X-Ray traces; CloudWatch RUM for the web app | Alarms on cost per RFQ > ₹ 150, queue age, failed sends |
| Accounts | AWS Organizations (sandbox / staging / prod), IAM Identity Center, Budgets with alerts | Apply for AWS Activate credits |
| Email | Microsoft Graph "send-as" for buyer mailboxes; Amazon SES for system mail | Forward-to-RFQ inbox via SES inbound → S3 → queue |

## 2. Backend modules to build

1. **Identity & organisations.** Buyer orgs, plants, users, sub-roles (Buyer, Purchase head, Plant head, Finance, Viewer); supplier orgs keyed by GSTIN (Owner, Quoting, Dispatch); admin roles (Ops, Verifier, Finance, Super-admin); permission matrix enforced in the API, not the UI.
2. **Order ontology.** RFQ, RFQ line, invitation, quote, quote line, award, PO, PO line, acknowledgement, ASN, GRN, invoice, credit/debit note, document, document line. Every document line holds a `po_line_id`. Numbered documents (`RFQ-000123`, …) from per-type sequences.
3. **Sealed bidding.** Quote submission hashed (SHA-256 over a canonical JSON form) at submit time. Prices are not readable by anyone until the sealed period ends, enforced by database row policy. Unsealing is scheduled and audited.
4. **Costing service.** Server-side twin of `costing.ts` (normalised, landed, savings, should-cost band, three-way match, DoA). The same test vectors run in both, and every computed number is stored with its source.
5. **Matching.** Similar parts (pgvector over extracted features), capability, certificates, OTD/PPM, distance. Verification tiers kept separate from rank.
6. **Messaging.** WhatsApp Business templates and Flows; inbound webhook; parsing of short replies, photos and voice into confirmation cards; JOIN / STATUS / HELP / STOP keywords; two-reminder rule; delivery and read tracking per template.
7. **Commitments.** Created from awards, POs and queries; reminders through the scheduler; ops task after two reminders.
8. **Documents.** Generate PO, debit-note and other drafts from PO data (customer template or ours). Verify e-invoice IRN and e-way bill. Run the dispatch cross-check (quantity, HSN, GSTIN, value, Incoterm, consignee) before "Shipped".
9. **Verification.** GSTIN lookup, PAN–name match, bank check by ₹1 penny drop, certificate checks; four-eyes above Document-verified.
10. **Metering.** One event per paid action (RFQ created, document extracted, quote drafted, message sent, call minute, document generated) with model cost; rolled up per RFQ and per org; ₹ 150 alert.
11. **Audit log.** Append-only table; each event hash = SHA-256(previous hash + event). Periodic anchor written to the Object Lock bucket. Exportable audit bundle per PO or RFQ. Kept at least 72 months.
12. **Admin APIs.** Stuck items, verification queue, RFQ operations including Phase A manual mode, directory, buyer orgs and plans, templates, cost & evals, disputes.

## 3. AI pipeline

| Step | Build | Gate |
|---|---|---|
| Extraction (drawing / STEP / TDS) | Fields with value, unit, confidence and source span (page + bounding box). Threshold 0.75. Fallback to Opus-class, then human confirm. Same pattern for catalogue PDFs, MTCs and WhatsApp quotes | 95% field accuracy on 50 real drawings at under ₹ 20 per drawing, before M3 |
| Voice and Indian languages | Sarvam ASR → structured quote → confirmation card | Accuracy per language tracked in the eval suite |
| Matching | Embeddings for parts and capabilities; rule weights in settings | Quotes per RFQ ≥ 3 (median) |
| Drafting | Query answers, reminders, cross-check findings, negotiation briefs; always land in a proposed state | Nothing sends without approval |
| Routing | Sonnet-class for documents and drawings, Opus-class fallback, Haiku-class for masking, classification and alerts, Sarvam for voice | Model access: Anthropic API or Amazon Bedrock; confirm model availability in ap-south-1 before choosing |
| Evals | Every real case becomes a permanent test. Track field accuracy, calibration, cost per document, latency. CI blocks a model change that lowers accuracy | — |
| Fine-tuning (later) | Only drawing / MTC extraction, HSN/HTS suggestion, capability tagging, WhatsApp quote parsing. Never negotiation or money | After enough labelled cases |

## 4. Integrations by phase

| Integration | Phase | Notes |
|---|---|---|
| WhatsApp Business (templates, Flows), DLT registration | 1 | Open decision: direct Cloud API or BSP |
| GST / PAN / bank verification providers | 1 | Penny drop for bank |
| Microsoft 365 send-as (Graph), RFQ email inbox | 1 | — |
| e-invoice IRN and e-way bill verification | 1 (M4) | Read and verify; the supplier still issues |
| Masked calls with recorded consent (Exotel / Knowlarity / Twilio India) | 2 (M5) | Open decisions: provider and consent wording |
| Logistics providers, transport RFQ | 2 (M6) | — |
| Export document pack | 2 (M6) | Shipping bill, CoO, B/L, e-BRC |
| Tally / Zoho, live freight, LC discounting partners | 3 | — |

## 5. Frontend work that remains

- **Connect to real APIs.** Switch `VITE_API_MODE=http`, add the write operations (approve, send, submit quote, post GRN and so on), add optimistic updates and conflict handling.
- **Sign-in.** Cognito hosted flows or custom UI for the three sign-in methods; route guards per role and sub-role; session timeout.
- **File uploads.** Presigned S3 uploads with progress; PDF viewer with real source-span overlays from extraction coordinates; STEP viewer.
- **Live updates.** Server-sent events or WebSocket for chat, query tracker, alerts and (Phase 2) auctions.
- **Languages.** Tamil, Hindi, Kannada and Telugu for the supplier app (picker already present); copy review with native speakers.
- **Supplier offline support.** Installable PWA with offline queue for poor shop-floor connectivity.
- **End-to-end tests.** Playwright over the main paths (Join → Quote, Create request → Compare → Award → PO, GRN → three-way match), plus visual regression using the screenshot script.
- **Accessibility.** WCAG 2.1 AA audit (contrast, focus order, screen-reader labels on tables and chips).
- **Monitoring and analytics.** CloudWatch RUM or Sentry for errors; event tracking for the three key numbers.

## 6. Security checklist (before any real data)

- Tenant isolation enforced in the database (Postgres row-level security keyed by org), plus API authorisation tests that prove Buyer A cannot read Buyer B.
- Supplier floor price in its own column, encrypted, excluded from every buyer and admin read model.
- Other suppliers' bids never returned to a supplier; buyer contact fields withheld until award.
- WAF managed rules and rate limits on auth and webhook endpoints; WhatsApp webhook signature verification.
- Drawings watermarked per viewer; signed, short-lived download URLs.
- KMS encryption at rest; TLS 1.2+ in transit; no long-lived AWS keys (OIDC for CI).
- Audit hash chain verified daily; anchors in S3 Object Lock.
- Backups and restore drill on RDS; least-privilege IAM per service.
- Opus-class security review of each milestone before release.

## 7. Milestone plan (backend + wiring)

| Milestone | Scope | Done when |
|---|---|---|
| **M1** | Order ontology schema, numbering, audit chain, metering, sign-in (3 roles), supplier Join with GST lookup and WhatsApp OTP | A real Hosur supplier joins with their GSTIN on WhatsApp, appears in the Verification queue, and both events appear in the audit log with a verified chain |
| **M2** | Catalogue extraction, buyer RFQ creation, drawing / data-sheet intake with confidence and spans, trial rules | A real drawing becomes an RFQ draft. Low-confidence fields are confirmed by the buyer, and the extraction cost is metered under ₹ 20 |
| **M3** | Matching, sealed quoting on WhatsApp (Flow + voice), quote reminders | One real RFQ gets 3 or more sealed quotes over WhatsApp, with hashes, within 48 h |
| **M4** | Compare, award with DoA, PO, domestic documents, dispatch cross-check | The real case goes from compare to an approved award to a PO acknowledged on WhatsApp. A planted HSN mismatch is caught before "Shipped" |
| **M5** | Negotiation rounds, masked calls with consent, briefs, revisions | A buyer–supplier call runs through the platform number with a stored recording and an approved summary |
| **M6** | Logistics providers, transport RFQs, languages, admin console live, export documents, electrical fields | A Tamil-speaking supplier completes a quote in Tamil; an export pack is assembled for one order |
| **M7** | GRN, three-way match, audit pack | A real GRN and invoice match automatically. A mismatched invoice is held. The audit bundle exports and verifies |

## 8. Open decisions and gates

- **Legal gate:** production code starts on the date the advocate sets after reviewing the employment contract.
- **Brand:** final name and domain. The name is one constant in the code.
- **WhatsApp:** direct Cloud API or BSP; DLT registration.
- **Calls:** call provider and recording-consent wording; non-circumvention terms.
- **Markets:** first export markets and launch languages.
- **Model access:** Anthropic API or Amazon Bedrock (data residency, region availability).
- **Commercials:** fee model (parked), how we earn on export deals, inspection partner.

## 9. Suggested next step

Approve the frontend screens. Then start M1 on the backend with the schema, audit chain and supplier Join. This lets the Phase A pilot (20 suppliers, 10 real RFQs) run on real infrastructure from the first supplier.
