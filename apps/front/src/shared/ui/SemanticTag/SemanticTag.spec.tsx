import { ConfigProvider } from 'antd';
import { ThemeModeProvider } from '@/shared/lib/theme-mode/ThemeModeProvider';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SemanticTag } from './SemanticTag';

describe('SemanticTag', () => {
  it('renders its content with the semantic income color', () => {
    render(
      <ConfigProvider>
        <ThemeModeProvider>
          <SemanticTag tone="income">Paid</SemanticTag>
        </ThemeModeProvider>
      </ConfigProvider>,
    );

    expect(screen.getByText('Paid')).toHaveStyle({ color: 'rgb(46, 125, 91)' });
  });
});
