import { describe, expect, it } from 'vitest';
import { defaultSettings } from '@/store/analyzeStore';
import { applyLegacySettingsJson } from '../legacySettings';

describe('applyLegacySettingsJson', () => {
  it('maps legacy json settings into FormSettings', () => {
    const raw = JSON.stringify({
      'Ad-Soyad': '1',
      'Ad-Soyad_LEN': '25',
      '\u00d6\u011fr. No': '26',
      '\u00d6\u011fr. No_LEN': '11',
      '\u004b\u0069\u0074\u0061\u0070\u00e7\u0131\u006b': '37',
      Cevaplar: '39',
      'Ek Alanlar': [],
      'Yanl\u0131\u015f Kriteri': '0',
      'Ders Sayisi': '3',
      'Ders Detaylari': [
        { ad: 'A\u0130\u0130T', adet: '20', puan: '', bas: '' },
        { ad: 'TDL', adet: '20', puan: '', bas: '' },
        { ad: 'YBD', adet: '20', puan: '', bas: '' },
      ],
    });

    const settings = applyLegacySettingsJson(raw, defaultSettings);

    expect(settings.bookletColumn.start).toBe(37);
    expect(settings.answersStart).toBe(39);
    expect(settings.wrongCriterion).toBe(0);
    expect(settings.courses.map((course) => course.name)).toEqual(['A\u0130\u0130T', 'TDL', 'YBD']);
  });

  it('supports mojibake legacy keys and keeps fallback values when course rows are blank', () => {
    const raw = JSON.stringify({
      'Ã–ÄŸr. No': '26',
      'Ã–ÄŸr. No_LEN': '11',
      'KitapÃ§Ä±k': '44',
      'YanlÄ±ÅŸ Kriteri': '0',
      'Ders Sayisi': '2',
      'Ders Detaylari': [
        { ad: '', adet: '', puan: '', bas: '' },
        { ad: '', adet: '', puan: '', bas: '93' },
      ],
    });

    const settings = applyLegacySettingsJson(raw, defaultSettings);

    expect(settings.studentIdColumn.start).toBe(26);
    expect(settings.bookletColumn.start).toBe(44);
    expect(settings.courses).toHaveLength(2);
    expect(settings.courses[0].questionCount).toBe(defaultSettings.courses[0].questionCount);
    expect(settings.courses[1].startOffset).toBe(93);
  });
});
