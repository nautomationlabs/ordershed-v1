# Ordershed (working name)

An AI-run supply network for engineered parts made in India. Buyers upload a drawing; the system reads it, finds verified Indian suppliers, collects sealed quotes (web or WhatsApp), compares them on normalised and landed cost with every number sourced, and carries the award through PO, documents, dispatch cross-check, GRN, three-way match and a permanent audit record.

The brand is under review. The name lives in one place: `apps/web/src/config/brand.ts`.

## Repository

```
apps/web/            React + TypeScript frontend (Buyer, Supplier, Admin)
  src/api/           typed API client, domain types (order ontology), sandbox data
  src/components/    shared design-system components (table, status chip, source tag, AI proposal, ...)
  src/shells/        desktop shell (Buyer/Admin) and phone shell (Supplier)
  src/features/      screens by role: buyer/, supplier/, admin/, public/
  src/lib/           money maths (costing.ts), formatting, command-bar grammar, with tests
  scripts/           screenshot capture
  Dockerfile         nginx image for ECS Fargate
infra/aws/           CloudFormation: S3 + CloudFront (OAC, security headers, SPA routing)
.github/workflows/   CI: typecheck, test, build, deploy to S3/CloudFront via OIDC
services/api/        backend: Fastify + PostgreSQL (row-level security, audit chain, sign-in, supplier Join)
  migrations/        SQL schema, applied in order
docker-compose.yml   local PostgreSQL 16 (pgvector)
docs/                progress report, remaining work, screenshots
```

## Run locally

Requires Node 22.

```bash
npm install
npm run dev          # http://localhost:5173 — opens the screen index
npm test             # unit tests (costing, three-way match, DoA, command bar)
npm run typecheck
npm run build        # production bundle in apps/web/dist
```

Sandbox data is served in the browser (`VITE_API_MODE=mock`). Point at a backend with `VITE_API_MODE=http` and `VITE_API_BASE_URL`. See `apps/web/.env.example`.

Review list states on any list screen by adding `?demo=empty`, `?demo=loading` or `?demo=error` to the URL.

## Backend (M1)

Requires Docker Desktop.

```bash
npm run db:up        # PostgreSQL on localhost:5433
npm run migrate      # apply services/api/migrations
npm run seed         # dev users: ops@ordershed.test (admin), verifier@ordershed.test, rohan@kestrel.test (buyer)
npm run dev:api      # API on http://localhost:8080 (codes are printed in this console)
npm run test:api     # 51 tests against a real database (tenant isolation, sealed bids, audit chain, Join)
```

With the API running, `npm run dev` serves the web app in **hybrid** mode (`apps/web/.env.development.local`):
Join, Sign-in, Verification queue and Audit log call the real API; every other screen stays on sandbox data.
Try it: open http://localhost:5173/s/join, use GSTIN `33AAKFV2210M1Z7` (fictional) and any mobile number;
the WhatsApp code appears in the API console. Then sign in at /login as Admin with `ops@ordershed.test`.

Browser end-to-end check of the whole flow: `API_LOG=<api console log file> node apps/web/scripts/e2e-m1.mjs`.

Integrations switch by environment variable (see `.env.example`): `WHATSAPP_MODE=console|cloud`,
`GST_PROVIDER=stub|cashfree`. Secrets live only in the git-ignored `.env`.

## Screenshots

```bash
npm run build -w apps/web
npx -w apps/web vite preview --port 4173 &
npm run screenshots   # uses the installed Chrome; writes docs/screenshots/*.png
```

## Deploy (AWS, ap-south-1)

1. `aws cloudformation deploy --region ap-south-1 --stack-name ordershed-web-sandbox --template-file infra/aws/frontend.yaml --parameter-overrides EnvName=sandbox ApiOrigin=https://api.example.com`
2. Set GitHub repo variables `WEB_BUCKET`, `WEB_DISTRIBUTION_ID` (stack outputs) and secret `AWS_DEPLOY_ROLE_ARN` (an IAM role trusting GitHub OIDC with `s3:PutObject/DeleteObject/ListBucket` on the bucket and `cloudfront:CreateInvalidation`).
3. Push to `main`. The workflow typechecks, tests, builds and deploys.

Alternative: `docker build -f apps/web/Dockerfile -t ordershed-web .` and run on ECS Fargate behind an ALB.

## Product rules the code enforces

- Every number carries a source tag (Supplier · HTS · Freight quote · Computed); the `Num` component requires one.
- Prices, totals, duty and landed cost are computed in `src/lib/costing.ts`, never by a model.
- AI output appears only in a "Proposed" box with a confidence chip and Approve / Edit. Nothing is sent without a tap.
- Buyer contacts and names stay hidden from suppliers until award; supplier floor price is private.
- Status is always a word plus a colour.
