import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCalendarBoard } from '../../model/useCalendarBoard';
import { useTaxComplianceCalendar } from '@/entities/tax-compliance';
import { useWorkspaceAccess } from '@/entities/workspace-member';
import { useThemeMode } from '@/shared/lib/theme-mode/ThemeModeProvider';
import { CalendarPage } from './CalendarPage';

vi.mock('../../model/useCalendarBoard', () => ({ useCalendarBoard: vi.fn() }));
vi.mock('@/entities/tax-compliance', () => ({ useTaxComplianceCalendar: vi.fn() }));
vi.mock('@/entities/workspace-member', () => ({ useWorkspaceAccess: vi.fn() }));
vi.mock('@/shared/lib/theme-mode/ThemeModeProvider', () => ({ useThemeMode: vi.fn() }));
vi.mock('../dnd/CalendarDndContext', () => ({ CalendarDndContext: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('../schedulable/SchedulablePanel', () => ({ SchedulablePanel: () => null }));
vi.mock('../staff/StaffPanel', () => ({ StaffPanel: () => null }));
vi.mock('../monthGrid/MonthGrid', () => ({ MonthGrid: () => <div>mes</div> }));
vi.mock('../weekGrid/WeekGrid', () => ({ WeekGrid: () => <div>semana</div> }));
vi.mock('../conflicts/ConflictSummary', () => ({ ConflictSummary: () => null }));
vi.mock('../eventEditor/EventEditorModal', () => ({ EventEditorModal: () => null }));
vi.mock('../taxDeadline/TaxDeadlineModal', () => ({ TaxDeadlineModal: () => null }));

const board = {
  view: 'month', setView: vi.fn(), cursor: '2026-08-01', range: { from: '2026-08-01', to: '2026-08-31' },
  board: null, loading: false, loadError: false, projects: [], staffMembers: [], equipment: [],
  goToday: vi.fn(), goPrevious: vi.fn(), goNext: vi.fn(), createFromDrop: vi.fn(), moveEvent: vi.fn(),
  resizeEvent: vi.fn(), saveEvent: vi.fn(), removeEvent: vi.fn(), materializeDerivedRange: vi.fn(), assignStaffToEvent: vi.fn(),
};

describe('CalendarPage', () => {
  beforeEach(() => {
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
});
