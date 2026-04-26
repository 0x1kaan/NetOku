import { render, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { useAnalyzeStore } from '@/store/analyzeStore';
import { Analyze } from '../Analyze';

describe('Analyze page', () => {
  beforeEach(() => {
    useAnalyzeStore.getState().reset();
  });

  it('hydrates selected preset from the preset query param', async () => {
    render(
      <MemoryRouter initialEntries={['/app/analyze?preset=tyt-temel-4-ders']}>
        <Analyze />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(useAnalyzeStore.getState().selectedPresetId).toBe('tyt-temel-4-ders');
    });
    expect(useAnalyzeStore.getState().settings.courses).toHaveLength(4);
  });
});
