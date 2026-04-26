import { describe, expect, it } from 'vitest';
import { createDataExportZipBlob } from '../data-export';
import type { ExportedData } from '../account';

async function blobToAscii(blob: Blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  return Array.from(bytes, (byte) => String.fromCharCode(byte)).join('');
}

describe('data export zip', () => {
  it('creates a valid zip envelope with the expected JSON files', async () => {
    const data: ExportedData = {
      exported_at: '2026-04-26T00:00:00.000Z',
      profile: { id: 'user-1', email: 'teacher@example.com' },
      analyses: [{ id: 'analysis-1' }],
      presets: [{ id: 'preset-1' }],
    };

    const blob = createDataExportZipBlob(data);
    const ascii = await blobToAscii(blob);

    expect(blob.type).toBe('application/zip');
    expect(ascii.startsWith('PK\u0003\u0004')).toBe(true);
    expect(ascii).toContain('manifest.json');
    expect(ascii).toContain('profile.json');
    expect(ascii).toContain('analyses.json');
    expect(ascii).toContain('presets.json');
    expect(ascii).toContain('netoku-export.json');
    expect(ascii).toContain('PK\u0005\u0006');
  });
});
