/** Create request: upload a drawing, read the proposed fields, confirm or correct them. Buyer side only. */
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { AppDeps } from '../app.js';
import { withTx } from '../db/pool.js';
import { ctxOf, requireSession } from '../http/auth.js';
import { badRequest } from '../http/errors.js';
import { DRAWING_MEDIA_TYPES } from '../integrations/extractor.js';
import { confirmField, createDraftFromDrawing, drawingFile, getDraft } from '../services/extraction.js';

const EDIT_ROLES = ['buyer', 'purchase_head', 'plant_head'] as const;
const rfqNumber = z.string().regex(/^RFQ-\d{6}$/);
const confirmBody = z.object({ value: z.string().trim().min(1).max(500).optional(), unit: z.string().trim().max(20).nullable().optional() });

/** Sniffs the first bytes so a renamed file cannot pass as a drawing. */
function sniff(b: Buffer): string | null {
  if (b.subarray(0, 5).toString('latin1') === '%PDF-') return 'application/pdf';
  if (b[0] === 0x89 && b.subarray(1, 4).toString('latin1') === 'PNG') return 'image/png';
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b.subarray(0, 4).toString('latin1') === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'WEBP') return 'image/webp';
  return null;
}

export async function rfqRoutes(app: FastifyInstance, deps: AppDeps) {
  app.addContentTypeParser([...DRAWING_MEDIA_TYPES], { parseAs: 'buffer', bodyLimit: deps.config.UPLOAD_MAX_MB * 1_000_000 }, (_req, body, done) => done(null, body));

  app.post('/v1/rfqs/drafts', { bodyLimit: deps.config.UPLOAD_MAX_MB * 1_000_000 }, async (req, reply) => {
    const s = requireSession(req, ['buyer'], EDIT_ROLES);
    const bytes = req.body;
    if (!Buffer.isBuffer(bytes) || bytes.length === 0) throw badRequest('no_file', 'Upload a drawing as PDF, PNG, JPEG or WebP.');
    const mediaType = sniff(bytes);
    if (!mediaType) throw badRequest('unsupported_file', 'This file is not a PDF, PNG, JPEG or WebP.');
    const rawName = decodeURIComponent(String(req.headers['x-file-name'] ?? 'drawing'));
    const fileName = rawName.replace(/[^\w .()-]/g, '_').slice(0, 120) || 'drawing';
    const draft = await createDraftFromDrawing(deps, s, { bytes, mediaType, fileName });
    return reply.code(201).send(draft);
  });

  app.get('/v1/rfqs/:number/extraction', async (req) => {
    const s = requireSession(req, ['buyer', 'platform']);
    const number = rfqNumber.parse((req.params as { number: string }).number);
    return withTx(deps.db, ctxOf(s), (tx) => getDraft(tx, number));
  });

  app.post('/v1/rfqs/:number/extraction/fields/:key/confirm', async (req) => {
    const s = requireSession(req, ['buyer'], EDIT_ROLES);
    const { number, key } = req.params as { number: string; key: string };
    const body = confirmBody.parse(req.body ?? {});
    const edit = body.value !== undefined ? { value: body.value, unit: body.unit } : undefined;
    return withTx(deps.db, ctxOf(s), (tx) => confirmField(tx, s, rfqNumber.parse(number), key, edit));
  });

  app.get('/v1/rfqs/:number/drawing', async (req, reply) => {
    const s = requireSession(req, ['buyer', 'platform']);
    const number = rfqNumber.parse((req.params as { number: string }).number);
    const f = await withTx(deps.db, ctxOf(s), (tx) => drawingFile(tx, number));
    const bytes = await deps.storage.get(f.key);
    return reply
      .header('content-type', f.mediaType)
      .header('content-disposition', `inline; filename="${f.fileName.replace(/"/g, '')}"`)
      .header('x-content-type-options', 'nosniff')
      .header('cache-control', 'private, no-store')
      .send(bytes);
  });
}
