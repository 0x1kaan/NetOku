import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useAnalyzeStore } from '@/store/analyzeStore';
import { CoursesStep } from '../CoursesStep';

describe('CoursesStep', () => {
  beforeEach(() => {
    useAnalyzeStore.getState().reset();
  });

  it('renders LGS as a locked 6-course preset form', () => {
    useAnalyzeStore.getState().applyPreset('lgs-standart');

    render(<CoursesStep />);

    expect(screen.getByDisplayValue('Turkce')).toBeInTheDocument();
    expect(screen.getByDisplayValue('T.C. Inkilap')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Din Kulturu')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Ingilizce')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Matematik')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Fen Bilimleri')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Ders Ekle/i })).not.toBeInTheDocument();
  });
});
