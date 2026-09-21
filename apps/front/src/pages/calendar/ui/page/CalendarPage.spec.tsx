import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCalendarBoard } from '../../model/useCalendarBoard';
import { useTaxComplianceCalendar } from '@/entities/tax-compliance';
import { useWorkspaceAccess } from '@/entities/workspace-member';
import { useThemeMode } from '@/shared/lib/theme-mode/ThemeModeProvider';
import type { TaxDeadlineDto } from '@/entities/tax-compliance';
import { CalendarPage } from './CalendarPage';

const calendarMocks = vi.hoisted(() => ({
  monthGridProps: undefined as unknown,
  taxDeadlineModalProps: undefined as unknown,
}));

vi.mock('../../model/useCalendarBoard', () => ({ useCalendarBoard: vi.fn() }));
vi.mock('@/entities/tax-compliance', () => ({ useTaxComplianceCalendar: vi.fn() }));
vi.mock('@/entities/workspace-member', () => ({ useWorkspaceAccess: vi.fn() }));
vi.mock('@/shared/lib/theme-mode/ThemeModeProvider', () => ({ useThemeMode: vi.fn() }));
vi.mock('../dnd/CalendarDndContext', () => ({ CalendarDndContext: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('../schedulable/SchedulablePanel', () => ({ SchedulablePanel: () => null }));
vi.mock('../staff/StaffPanel', () => ({ StaffPanel: () => null }));
vi.mock('../monthGrid/MonthGrid', () => ({
  MonthGrid: (props: unknown) => {
    calendarMocks.monthGridProps = props;
    return <div>mes</div>;
  },
}));
vi.mock('../weekGrid/WeekGrid', () => ({ WeekGrid: () => <div>semana</div> }));
vi.mock('../conflicts/ConflictSummary', () => ({ ConflictSummary: () => null }));
vi.mock('../eventEditor/EventEditorModal', () => ({ EventEditorModal: () => null }));
vi.mock('../taxDeadline/TaxDeadlineModal', () => ({
  TaxDeadlineModal: (props: unknown) => {
    calendarMocks.taxDeadlineModalProps = props;
    return null;
  },
}));

const board = {
  view: 'month', setView: vi.fn(), cursor: '2026-08-01', range: { from: '2026-08-01', to: '2026-08-31' },
  board: null, loading: false, loadError: false, projects: [], staffMembers: [], equipment: [],
  goToday: vi.fn(), goPrevious: vi.fn(), goNext: vi.fn(), createFromDrop: vi.fn(), moveEvent: vi.fn(),
  resizeEvent: vi.fn(), saveEvent: vi.fn(), removeEvent: vi.fn(), materializeDerivedRange: vi.fn(), assignStaffToEvent: vi.fn(),
};

const deadline: TaxDeadlineDto = {
  id: 'deadline-1',
  projectId: 'project-1',
  obligationKey: 'es-aeat-model-303-quarterly',
  code: '303',
  category: 'vat',
  periodStart: '2026-07-01',
  periodEnd: '2026-09-30',
  startDate: '2026-10-20',
  endDate: '2026-10-20',
  dueDate: '2026-10-20',
  status: 'pending',
  rule: { kind: 'quarterly', dueDay: 20, fourthQuarterDueDay: 30 },
  sourceUrl: 'https://example.test/aeat',
  sourceVersion: 'AEAT-2026',
  projectName: 'Project One',
  projectCode: 'P-001',
  projectColor: null,
};

describe('CalendarPage', () => {
  beforeEach(() => {
    calendarMocks.monthGridProps = undefined;
    calendarMocks.taxDeadlineModalProps = undefined;
    vi.mocked(useThemeMode).mockReturnValue({ mode: 'light' } as never);
    vi.mocked(useWorkspaceAccess).mockReturnValue({ canAccess: () => true } as never);
    vi.mocked(useTaxComplianceCalendar).mockReturnValue({ deadlines: [], loadError: false } as never);
    vi.mocked(useCalendarBoard).mockReturnValue(board as never);
  });

  it('shows the board loading error without mounting scheduling controls', () => {
    vi.mocked(useCalendarBoard).mockReturnValue({ ...board, loadError: true } as never);
    render(<CalendarPage />);
    expect(screen.getByRole('alert')).toHaveTextContent('No se ha podido cargar el calendario.');
    expect(screen.queryByText('mes')).not.toBeInTheDocument();
  });

  it('delegates header navigation to the calendar board model', async () => {
    const user = userEvent.setup();
    render(<CalendarPage />);
    await user.click(screen.getByRole('button', { name: 'Anterior' }));
    await user.click(screen.getByRole('button', { name: 'Hoy' }));
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    expect(board.goPrevious).toHaveBeenCalledOnce();
    expect(board.goToday).toHaveBeenCalledOnce();
    expect(board.goNext).toHaveBeenCalledOnce();
  });

  it('passes the selected self-contained deadline through without changing it', () => {
    vi.mocked(useTaxComplianceCalendar).mockReturnValue({
      deadlines: [deadline],
      loadError: false,
    } as never);
    render(<CalendarPage />);

    const monthGridProps = calendarMocks.monthGridProps as {
      deadlinesById: Map<string, TaxDeadlineDto>;
      onSelectTaxDeadline: (selected: TaxDeadlineDto) => void;
    };
    expect(monthGridProps.deadlinesById.get(deadline.id)).toBe(deadline);

    act(() => monthGridProps.onSelectTaxDeadline(deadline));

    expect(
      (calendarMocks.taxDeadlineModalProps as { deadline: TaxDeadlineDto | null }).deadline,
    ).toBe(deadline);
  });
});
