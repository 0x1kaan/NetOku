import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { Presets } from '../Presets';
import { useAnalyzeStore } from '@/store/analyzeStore';

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{`${location.pathname}${location.search}`}</div>;
}

describe('Presets page', () => {
  beforeEach(() => {
    useAnalyzeStore.getState().reset();
  });

  it('navigates built-in preset usage through the preset query param', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/app/presets']}>
        <Routes>
          <Route
            path="/app/presets"
            element={
              <>
                <Presets />
                <LocationProbe />
              </>
            }
          />
          <Route path="/app/analyze" element={<LocationProbe />} />
        </Routes>
      </MemoryRouter>,
    );

    await user.click(screen.getAllByRole('button', { name: /Kullan/i })[0]);

    expect(screen.getByTestId('location')).toHaveTextContent(
      '/app/analyze?preset=tyt-temel-4-ders',
    );
    expect(useAnalyzeStore.getState().selectedPresetId).toBe('tyt-temel-4-ders');
  });
});
