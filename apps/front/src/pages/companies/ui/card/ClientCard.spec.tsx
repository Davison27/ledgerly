import { App } from 'antd';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { ClientSummaryDto } from '@/entities/client';
import { ClientCard } from './ClientCard';

const client: ClientSummaryDto = {
  id: 'client-1',
  name: 'Acme Construction',
  taxId: 'B12345678',
  contactName: 'Ada Lovelace',
  contactEmail: 'ada@example.com',
  contactPhone: '+34 600 000 000',
  archivedAt: null,
  projectCount: 2,
};

function renderCard(overrides: Partial<React.ComponentProps<typeof ClientCard>> = {}) {
  const props: React.ComponentProps<typeof ClientCard> = {
    client,
    canEdit: true,
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    onUnarchive: vi.fn(),
    onOpen: vi.fn(),
    ...overrides,
  };

  return {
    ...render(
      <App>
        <ClientCard {...props} />
      </App>,
    ),
    props,
  };
}

describe('ClientCard', () => {
  it('opens the scoped projects when the card body is clicked', async () => {
    const user = userEvent.setup();
    const { props } = renderCard();

    await user.click(screen.getByText('Ada Lovelace'));

    expect(props.onOpen).toHaveBeenCalledWith(client);
  });

  it('keeps menu actions from opening the scoped projects', async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    const { props } = renderCard({ onEdit });

    await user.click(screen.getByRole('button', { name: 'Acciones' }));
    await user.click(screen.getByRole('menuitem', { name: /Modificar/ }));

    expect(onEdit).toHaveBeenCalledWith(client);
    expect(props.onOpen).not.toHaveBeenCalled();
  });

  it('renders the localized project count only once', () => {
    const { container } = renderCard();

    expect(container.querySelector('.ant-card')).toHaveTextContent('2 proyectos');
    expect(container.querySelector('.ant-card')).not.toHaveTextContent('2 2 proyectos');
  });
});
