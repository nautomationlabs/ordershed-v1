/**
 * File storage for uploaded drawings and data sheets. Local disk in development; S3 (presigned, SSE-KMS) with the
 * AWS deploy. Keys are opaque ("org/<org id>/<document number>"), never the user's file name.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, resolve } from 'node:path';

export interface Storage {
  readonly name: string;
  put(key: string, bytes: Buffer): Promise<void>;
  get(key: string): Promise<Buffer>;
}

export class LocalStorage implements Storage {
  readonly name = 'local';
  private root: string;
  constructor(dir: string) {
    // Relative paths are from the repo root, like the other local paths in .env.
    this.root = isAbsolute(dir) ? dir : resolve(import.meta.dirname, '../../../..', dir);
  }
  private path(key: string) {
    if (!/^[A-Za-z0-9/_.-]+$/.test(key) || key.includes('..')) throw new Error(`invalid storage key: ${key}`);
    return resolve(this.root, key);
  }
  async put(key: string, bytes: Buffer) {
    const p = this.path(key);
    await mkdir(dirname(p), { recursive: true });
    await writeFile(p, bytes);
  }
  get(key: string) {
    return readFile(this.path(key));
  }
}

/** In-memory storage for tests. */
export class MemoryStorage implements Storage {
  readonly name = 'memory';
  readonly files = new Map<string, Buffer>();
  async put(key: string, bytes: Buffer) {
    this.files.set(key, bytes);
  }
  async get(key: string) {
    const b = this.files.get(key);
    if (!b) throw new Error(`not found: ${key}`);
    return b;
  }
}
