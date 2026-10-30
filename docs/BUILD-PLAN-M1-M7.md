# Ordershed — Build plan, M1 to M7

Status as of 22-10-2026 · Frontend complete · Milestones run one after another, no dates.

Each milestone ends when its "Done when" case passes with real data.

## Before M1 (founder decisions and setup)
- [ ] Advocate reviews the employment contract and sets the start date for production code
- [ ] Final brand name and domain
- [ ] AWS Organization with sandbox, staging and prod accounts; Budgets alerts; apply for AWS Activate credits
- [ ] WhatsApp: choose direct Cloud API or a BSP; Meta business verification; DLT registration
- [ ] Model access: Anthropic API or Amazon Bedrock (check availability in ap-south-1)
- [ ] Pick the GST / PAN / bank verification provider
- [ ] Create the GitHub repository, push the frontend, set CI secrets

## M1: Foundation and supplier Join
- [ ] Deploy the frontend to the sandbox account (CloudFormation template and pipeline)
- [ ] Backend infrastructure as code: TypeScript API on ECS Fargate, ALB + WAF, RDS PostgreSQL, S3, SQS, Secrets Manager
- [ ] Order ontology schema, numbered documents per type, row-level security per organisation
- [ ] Hash-chained audit log, daily chain check, anchors in S3 Object Lock (72 months)
- [ ] Metering events (cost per RFQ)
- [ ] Sign-in with Cognito: buyer email OTP, supplier WhatsApp OTP, admin passkey; roles enforced in the API
- [ ] Supplier Join: GSTIN lookup, WhatsApp OTP, JOIN keyword, entry in the verification queue
- [ ] Connect the Join, Verification queue and Audit log screens to the real API

Done when: a real Hosur supplier joins with their GSTIN on WhatsApp, appears in the verification queue, and both events sit in a verified audit chain.

## M2: Catalogue and RFQ intake
- [ ] Drawing and data-sheet upload (presigned S3)
- [ ] Extraction: value, unit, confidence and source span per field; 0.75 threshold; fallback model; human confirm
- [ ] Supplier catalogue extraction (PDF, photo, Excel) into proposed product rows
- [ ] Buyer sign-up and KYB; Create request on real data
- [ ] Trial rules (ends at first PO or 60 days); plans as settings
- [ ] Eval suite started with 50 real drawings

Done when: a real drawing becomes an RFQ draft, low-confidence fields are confirmed by the buyer, and extraction costs under ₹ 20.

## M3: Matching and sealed quoting on WhatsApp
- [ ] Matching: similar parts (pgvector), capability, certificates, OTD/PPM, distance; tier kept separate from rank
- [ ] Find buyers (supplier side)
- [ ] WhatsApp RFQ template and Flow (Quote · Decline · Ask)
- [ ] Voice quotes through Sarvam into a confirmation card
- [ ] Sealed quotes: hash at submit, prices locked until the sealed period ends, scheduled and audited unseal
- [ ] Reminders: two, then an ops task (EventBridge Scheduler)
- [ ] Queries: AI-drafted answer, buyer approves, published to all invited suppliers

Done when: one real RFQ gets 3 or more sealed quotes over WhatsApp within 48 h.

## M4: Compare, award, PO, documents
- [ ] Server-side costing, the twin of `costing.ts`, with the same tests; every number stored with its source
- [ ] Compare and landed cost on real data (duty rates, freight quotes)
- [ ] Award with Delegation of Authority approvals and decision pack
- [ ] PO generation and acknowledgement on WhatsApp
- [ ] Domestic documents; e-invoice IRN and e-way bill verification
- [ ] Dispatch cross-check before "Shipped"

Done when: the real case goes from compare to an approved award to a PO acknowledged on WhatsApp, and a planted HSN mismatch is caught.

## M5: Negotiation and calls
- [ ] Negotiation rounds and quote revisions
- [ ] Message relay between buyer and supplier
- [ ] Masked calls with recorded consent (provider to choose: Exotel, Knowlarity or Twilio India)
- [ ] AI call summaries and negotiation briefs, approved before use

Done when: a buyer–supplier call runs through the platform number with a stored recording and an approved summary.

## M6: Logistics, languages, admin, export
- [ ] Logistics providers and transport RFQs
- [ ] Tamil, Hindi, Kannada and Telugu, reviewed by native speakers
- [ ] Admin console on real data (all 8 screens)
- [ ] Export document pack: shipping bill, certificate of origin, B/L, e-BRC
- [ ] Electrical part fields

Done when: a Tamil-speaking supplier completes a quote in Tamil, and an export pack is assembled for one order.

## M7: GRN, three-way match, audit pack
- [ ] Goods receipt posting and debit-note drafts
- [ ] Three-way match of PO, GRN and invoice; held invoices; MSME due dates
- [ ] Audit bundle export per PO or RFQ that verifies against the chain

Done when: a real GRN and invoice match automatically, a mismatched invoice is held, and the audit bundle exports and verifies.

## Every milestone
- [ ] Tenant isolation tests (Buyer A can never read Buyer B)
- [ ] End-to-end tests for the paths built so far; eval suite in CI
- [ ] Security review before release
- [ ] Founder approval for migrations, login and approval paths, secrets, spend and production deploys

## Later (Phase 2–3)
Reverse auctions, Tally / Zoho, live freight rates, LC discounting partners, offline supplier app.
