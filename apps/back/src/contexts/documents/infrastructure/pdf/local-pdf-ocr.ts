import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

@Injectable()
export class LocalPdfOcr {
  constructor(private readonly config: ConfigService) {}

  isEnabled(): boolean {
    return this.config.get<boolean>('PDF_OCR_ENABLED', true);
  }

  getMaxPages(): number {
    return this.config.get<number>('PDF_OCR_MAX_PAGES', 12);
  }

  async run(input: Buffer): Promise<Buffer> {
    const directory = await mkdtemp(join(tmpdir(), 'ledgerly-ocr-'));
    const source = join(directory, 'source.pdf');
    const output = join(directory, 'ocr.pdf');

    try {
      await writeFile(source, input, { mode: 0o600 });
      await execFileAsync(
        'ocrmypdf',
        [
          '--skip-text',
          '--output-type',
          'pdf',
          '--language',
          this.config.get<string>('PDF_OCR_LANGUAGE', 'spa'),
          '--tesseract-timeout',
          String(this.config.get<number>('PDF_OCR_TIMEOUT_SECONDS', 90)),
          '--skip-big',
          '20',
          source,
          output,
        ],
        { timeout: (this.config.get<number>('PDF_OCR_TIMEOUT_SECONDS', 90) + 30) * 1000, maxBuffer: 1024 * 1024 },
      );

      const outputSize = await stat(output);
      const maxOutputBytes = this.config.get<number>('PDF_MAX_OCR_OUTPUT_BYTES', 20 * 1024 * 1024);
      if (outputSize.size > maxOutputBytes) {
        throw new Error('OCR output exceeds the configured byte limit');
      }
      return await readFile(output);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  }
}
