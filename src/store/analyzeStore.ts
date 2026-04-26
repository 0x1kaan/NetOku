import { create } from 'zustand';
import type { AnalysisResult, AnswerKey, FormSettings, ParseResult } from '@/types/domain';
import { deriveStudentIssues } from '@/core/parser';
import {
  createFormSettingsFromPreset,
  getPresetConfig,
  type PresetConfig,
  type PresetId,
} from '@/presets';

export type WizardStep = 'upload' | 'mapping' | 'courses' | 'review' | 'result';

interface AnalyzeState {
  step: WizardStep;
  fileName: string | null;
  rawText: string | null;
  settings: FormSettings;
  selectedPresetId: PresetId | null;
  selectedPreset: PresetConfig | null;
  manualAnswerKeys: AnswerKey[];
  parsed: ParseResult | null;
  result: AnalysisResult | null;
  setStep: (s: WizardStep) => void;
  setFile: (name: string, raw: string) => void;
  setSettings: (s: FormSettings) => void;
  applyPreset: (presetId: PresetId) => void;
  clearPreset: () => void;
  setManualAnswerKeys: (keys: AnswerKey[]) => void;
  patchSettings: (patch: Partial<FormSettings>) => void;
  setParsed: (p: ParseResult | null) => void;
  setResult: (r: AnalysisResult | null) => void;
  patchStudent: (lineNumber: number, patch: { studentId?: string; booklet?: string }) => void;
  reset: () => void;
}

export const defaultSettings: FormSettings = {
  nameColumn: { start: 1, length: 25 },
  studentIdColumn: { start: 26, length: 11 },
  bookletColumn: { start: 42, length: 1 },
  answersStart: 43,
  extras: [
    { name: 'Program', start: 37, length: 2 },
    { name: 'Derslik', start: 39, length: 3 },
  ],
  courses: [{ name: 'Ders 1', questionCount: 20 }],
  wrongCriterion: 4,
};

export const useAnalyzeStore = create<AnalyzeState>((set) => ({
  step: 'upload',
  fileName: null,
  rawText: null,
  settings: defaultSettings,
  selectedPresetId: null,
  selectedPreset: null,
  manualAnswerKeys: [],
  parsed: null,
  result: null,
  setStep: (step) => set({ step }),
  setFile: (fileName, rawText) => set({ fileName, rawText, parsed: null, result: null }),
  setSettings: (settings) =>
    set({
      settings,
      selectedPresetId: null,
      selectedPreset: null,
      parsed: null,
      result: null,
    }),
  applyPreset: (presetId) =>
    set(() => {
      const preset = getPresetConfig(presetId);
      if (!preset) {
        return {
          selectedPresetId: null,
          selectedPreset: null,
          parsed: null,
          result: null,
        };
      }

      return {
        settings: createFormSettingsFromPreset(preset),
        selectedPresetId: preset.id,
        selectedPreset: preset,
        manualAnswerKeys: [],
        parsed: null,
        result: null,
      };
    }),
  clearPreset: () =>
    set({
      selectedPresetId: null,
      selectedPreset: null,
      parsed: null,
      result: null,
    }),
  setManualAnswerKeys: (manualAnswerKeys) => set({ manualAnswerKeys, parsed: null, result: null }),
  patchSettings: (patch) =>
    set((st) => ({ settings: { ...st.settings, ...patch }, parsed: null, result: null })),
  setParsed: (parsed) => set({ parsed }),
  setResult: (result) => set({ result }),
  patchStudent: (lineNumber, patch) =>
    set((st) => {
      if (!st.parsed) return st;
      const students = st.parsed.students.map((s) =>
        s.lineNumber === lineNumber
          ? {
              ...s,
              studentId: patch.studentId !== undefined ? patch.studentId : s.studentId,
              booklet: patch.booklet !== undefined ? patch.booklet : s.booklet,
            }
          : s,
      );
      const staticIssues = st.parsed.issues.filter(
        (issue) =>
          issue.type !== 'invalid_student_id' &&
          issue.type !== 'missing_booklet' &&
          issue.type !== 'duplicate_student_id',
      );
      return {
        parsed: {
          ...st.parsed,
          students,
          issues: [...staticIssues, ...deriveStudentIssues(students, st.settings)],
        },
      };
    }),
  reset: () =>
    set({
      step: 'upload',
      fileName: null,
      rawText: null,
      settings: defaultSettings,
      selectedPresetId: null,
      selectedPreset: null,
      manualAnswerKeys: [],
      parsed: null,
      result: null,
    }),
}));
