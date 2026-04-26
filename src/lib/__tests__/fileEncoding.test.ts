import { describe, expect, it } from 'vitest';
import { decodeCp1254Buffer, decodeTextBuffer } from '../fileEncoding';

describe('fileEncoding', () => {
  it('prefers utf-8 when the bytes are valid utf-8', () => {
    const bytes = new TextEncoder().encode('\u00d6\u011fr. No');
    expect(decodeTextBuffer(bytes)).toBe('\u00d6\u011fr. No');
  });

  it('falls back to windows-1254 for legacy cp1254 bytes', () => {
    const bytes = new Uint8Array([0xd6, 0xf0, 0x72, 0x2e, 0x20, 0x4e, 0x6f]);
    expect(decodeTextBuffer(bytes)).toBe('\u00d6\u011fr. No');
  });

  it('decodes uploaded txt files as cp1254 directly', () => {
    const bytes = new Uint8Array([0xd6, 0xf0, 0x72, 0x2e, 0x20, 0x4e, 0x6f]);
    expect(decodeCp1254Buffer(bytes)).toBe('\u00d6\u011fr. No');
  });
});
