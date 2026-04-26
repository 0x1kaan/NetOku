import { describe, it, expect, beforeEach } from 'vitest';
import { useAnalyzeStore, defaultSettings } from '../analyzeStore';
import { getPresetConfig } from '@/presets';
import type { AnswerKey, ParseResult, StudentRow } from '@/types/domain';

function resetStore() {
  useAnalyzeStore.getState().reset();
}

function makeStudent(partial: Partial<StudentRow>): StudentRow {
  return {
    lineNumber: 1,
    name: 'Ali',
    studentId: '1001',
    booklet: 'A',
    answers: 'ABCD'.padEnd(20, 'A'),
    extras: {},
    rawLine: '',
    ...partial,
  };
}

function makeParseResult(students: StudentRow[]): ParseResult {
  return {
    students,
    answerKeys: [{ booklet: 'A', answers: 'A'.repeat(20) } as AnswerKey],
    issues: [],
  };
}

describe('analyzeStore', () => {
  beforeEach(() => {
    resetStore();
  });

  it('starts on upload step with default settings', () => {
    const state = useAnalyzeStore.getState();
    expect(state.step).toBe('upload');
    expect(state.fileName).toBeNull();
    expect(state.rawText).toBeNull();
    expect(state.settings).toEqual(defaultSettings);
    expect(state.selectedPresetId).toBeNull();
    expect(state.selectedPreset).toBeNull();
    expect(state.parsed).toBeNull();
    expect(state.result).toBeNull();
  });

  it('setStep transitions across all wizard steps', () => {
    const steps: Array<ReturnType<typeof useAnalyzeStore.getState>['step']> = [
      'upload',
      'mapping',
      'courses',
      'review',
      'result',
    ];
    for (const s of steps) {
      useAnalyzeStore.getState().setStep(s);
      expect(useAnalyzeStore.getState().step).toBe(s);
    }
  });

  it('setFile stores file + clears prior parsed/result', () => {
    useAnalyzeStore.getState().setParsed(makeParseResult([makeStudent({})]));
    useAnalyzeStore.getState().setFile('form.txt', 'raw content');
    const s = useAnalyzeStore.getState();
    expect(s.fileName).toBe('form.txt');
    expect(s.rawText).toBe('raw content');
    expect(s.parsed).toBeNull();
    expect(s.result).toBeNull();
  });

  it('patchSettings merges and invalidates parsed/result', () => {
    useAnalyzeStore.getState().setParsed(makeParseResult([makeStudent({})]));
    useAnalyzeStore.getState().patchSettings({ wrongCriterion: 3 });
    const s = useAnalyzeStore.getState();
    expect(s.settings.wrongCriterion).toBe(3);
    // other fields untouched
    expect(s.settings.answersStart).toBe(defaultSettings.answersStart);
    expect(s.parsed).toBeNull();
  });

  it('setSettings replaces settings entirely and invalidates parsed/result', () => {
    useAnalyzeStore.getState().applyPreset('tyt-temel-4-ders');
    const custom = { ...defaultSettings, answersStart: 99 };
    useAnalyzeStore.getState().setParsed(makeParseResult([makeStudent({})]));
    useAnalyzeStore.getState().setSettings(custom);
    const s = useAnalyzeStore.getState();
    expect(s.settings.answersStart).toBe(99);
    expect(s.selectedPresetId).toBeNull();
    expect(s.selectedPreset).toBeNull();
    expect(s.parsed).toBeNull();
  });

  it('applyPreset stores selected preset settings and invalidates transient analysis state', () => {
    const preset = getPresetConfig('lgs-standart');
    expect(preset).not.toBeNull();
    useAnalyzeStore.getState().setParsed(makeParseResult([makeStudent({})]));
    useAnalyzeStore.getState().setManualAnswerKeys([{ booklet: 'A', answers: 'AAAA' }]);

    useAnalyzeStore.getState().applyPreset('lgs-standart');

    const s = useAnalyzeStore.getState();
    expect(s.selectedPresetId).toBe('lgs-standart');
    expect(s.selectedPreset?.title).toBe(preset?.title);
    expect(s.settings.courses).toHaveLength(6);
    expect(s.settings.wrongCriterion).toBe(3);
    expect(s.manualAnswerKeys).toEqual([]);
    expect(s.parsed).toBeNull();
    expect(s.result).toBeNull();
  });

  it('clearPreset keeps settings but returns to custom analysis mode', () => {
    useAnalyzeStore.getState().applyPreset('tek-ders-50');
    const settings = useAnalyzeStore.getState().settings;

    useAnalyzeStore.getState().clearPreset();

    const s = useAnalyzeStore.getState();
    expect(s.settings).toBe(settings);
    expect(s.selectedPresetId).toBeNull();
    expect(s.selectedPreset).toBeNull();
  });

  it('setManualAnswerKeys invalidates parsed/result', () => {
    useAnalyzeStore.getState().setParsed(makeParseResult([makeStudent({})]));
    useAnalyzeStore.getState().setManualAnswerKeys([
      { booklet: 'A', answers: 'AAAA' },
    ]);
    const s = useAnalyzeStore.getState();
    expect(s.manualAnswerKeys).toHaveLength(1);
    expect(s.parsed).toBeNull();
  });

  it('patchStudent updates only the matching line', () => {
    const students = [
      makeStudent({ lineNumber: 1, studentId: '1001', booklet: '' }),
      makeStudent({ lineNumber: 2, studentId: '', booklet: 'A' }),
    ];
    useAnalyzeStore.getState().setParsed(makeParseResult(students));
    useAnalyzeStore.getState().patchStudent(2, { studentId: '2002', booklet: 'B' });

    const s = useAnalyzeStore.getState();
    expect(s.parsed?.students[0].studentId).toBe('1001');
    expect(s.parsed?.students[1].studentId).toBe('2002');
    expect(s.parsed?.students[1].booklet).toBe('B');
  });

  it('patchStudent is a no-op when parsed is null', () => {
    const before = useAnalyzeStore.getState();
    useAnalyzeStore.getState().patchStudent(1, { studentId: '9999' });
    const after = useAnalyzeStore.getState();
    expect(after.parsed).toBeNull();
    expect(after).toBe(before);
  });

  it('reset returns everything to defaults', () => {
    const s = useAnalyzeStore.getState();
    s.setFile('form.txt', 'raw');
    s.patchSettings({ wrongCriterion: 2 });
    s.setStep('review');
    s.setManualAnswerKeys([{ booklet: 'A', answers: 'AA' }]);
    s.setParsed(makeParseResult([makeStudent({})]));

    useAnalyzeStore.getState().reset();

    const after = useAnalyzeStore.getState();
    expect(after.step).toBe('upload');
    expect(after.fileName).toBeNull();
    expect(after.rawText).toBeNull();
    expect(after.settings).toEqual(defaultSettings);
    expect(after.selectedPresetId).toBeNull();
    expect(after.selectedPreset).toBeNull();
    expect(after.manualAnswerKeys).toEqual([]);
    expect(after.parsed).toBeNull();
    expect(after.result).toBeNull();
  });
});
