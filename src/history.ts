import fs from 'fs/promises';
import path from 'path';
import { ensureDir } from './conversion';

export interface FileSignature {
  size: number;
  mtimeMs: number;
}

export interface FileRecord {
  signature: FileSignature;
  processedAt: string;
  outputPath: string;
}

export class ProcessingHistory {
  private data = new Map<string, FileRecord>();
  readonly filePath: string;

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  async load() {
    try {
      const content = await fs.readFile(this.filePath, 'utf8');
      const parsed = JSON.parse(content) as Record<string, FileRecord>;
      this.data = new Map(Object.entries(parsed));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        this.data.clear();
        return;
      }
      console.warn('Failed to load NoteSync history', error);
      this.data.clear();
    }
  }

  getRecord(relativePath: string) {
    return this.data.get(relativePath);
  }

  isSame(relativePath: string, signature: FileSignature) {
    const record = this.data.get(relativePath);
    if (!record) {
      return false;
    }
    return (
      record.signature.size === signature.size &&
      Math.abs(record.signature.mtimeMs - signature.mtimeMs) < 1
    );
  }

  async record(relativePath: string, signature: FileSignature, outputPath: string) {
    this.data.set(relativePath, {
      signature,
      processedAt: new Date().toISOString(),
      outputPath,
    });
    await this.save();
  }

  private async save() {
    const dir = path.dirname(this.filePath);
    await ensureDir(dir);
    const object = Object.fromEntries(this.data.entries());
    await fs.writeFile(this.filePath, JSON.stringify(object, null, 2), 'utf8');
  }
}
