import { describe, expect, it } from 'vitest';
import { buildStudentReportShareText, buildWhatsAppShareUrl } from '../share';

describe('share helpers', () => {
  it('builds a student report message', () => {
    expect(
      buildStudentReportShareText({
        studentName: 'Ali Veli',
        url: 'https://example.com/report/abc',
      }),
    ).toBe('Ali Veli için NetOku öğrenci raporu: https://example.com/report/abc');
  });

  it('encodes WhatsApp share text', () => {
    const url = buildWhatsAppShareUrl('Ali Veli için rapor: https://example.com/a b');
    expect(url).toBe(
      'https://wa.me/?text=Ali%20Veli%20i%C3%A7in%20rapor%3A%20https%3A%2F%2Fexample.com%2Fa%20b',
    );
  });
});

