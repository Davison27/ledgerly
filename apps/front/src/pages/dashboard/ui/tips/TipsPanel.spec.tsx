import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TipsPanel } from './TipsPanel';

describe('TipsPanel', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders a tip without emitting an Ant Design Alert deprecation warning', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    render(<TipsPanel tips={[{ id: 'healthy', severity: 'success', messageKey: 'dashboard.tips.healthy' }]} />);

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Buen trabajo: tu margen es saludable y no tienes documentos vencidos.',
    );
    expect(error.mock.calls.flat().join(' ')).not.toContain('Alert] `message` is deprecated');
  });
});
