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
  dndContextProps: undefined as unknown,
  eventEditorProps: undefined as unknown,
  schedulablePanelMounted: false,
  staffPanelMounted: false,
}));

vi.mock('../../model/useCalendarBoard', () => ({ useCalendarBoard: vi.fn() }));
vi.mock('@/entities/tax-compliance', () => ({ useTaxComplianceCalendar: vi.fn() }));
vi.mock('@/entities/workspace-member', () => ({ useWorkspaceAccess: vi.fn() }));
vi.mock('@/shared/lib/theme-mode/ThemeModeProvider', () => ({ useThemeMode: vi.fn() }));
vi.mock('../dnd/CalendarDndContext', () => ({
  CalendarDndContext: (props: { children: React.ReactNode }) => {
    calendarMocks.dndContextProps = props;
    return <>{props.children}</>;
  },
}));
vi.mock('../schedulable/SchedulablePanel', () => ({
  SchedulablePanel: () => {
    calendarMocks.schedulablePanelMounted = true;
    return null;
  },
}));
vi.mock('../staff/StaffPanel', () => ({
  StaffPanel: () => {
    calendarMocks.staffPanelMounted = true;
    return null;
  },
}));
vi.mock('../monthGrid/MonthGrid', () => ({
  MonthGrid: (props: unknown) => {
    calendarMocks.monthGridProps = props;
    return <div>mes</div>;
  },
}));
vi.mock('../weekGrid/WeekGrid', () => ({ WeekGrid: () => <div>semana</div> }));
vi.mock('../conflicts/ConflictSummary', () => ({ ConflictSummary: () => null }));
vi.mock('../eventEditor/EventEditorModal', () => ({
  EventEditorModal: (props: unknown) => {
    calendarMocks.eventEditorProps = props;
    return null;
  },
}));
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
    calendarMocks.dndContextProps = undefined;
    calendarMocks.eventEditorProps = undefined;
    calendarMocks.schedulablePanelMounted = false;
    calendarMocks.staffPanelMounted = false;
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

  it('does not request or render project-dependent calendar data without Projects view', () => {
    const grants = {
      calendar: { view: true, edit: true },
      projects: { view: false, edit: false },
      staff: { view: false, edit: false },
      equipment: { view: false, edit: false },
    };
    vi.mocked(useWorkspaceAccess).mockReturnValue({
      canAccess: (module: keyof typeof grants, level: 'view' | 'edit') => grants[module][level],
    } as never);
    vi.mocked(useCalendarBoard).mockReturnValue({
      ...board,
      board: { events: [], conflicts: [], summary: { errorCount: 0, infoCount: 0, byKind: {} } },
    } as never);

    render(<CalendarPage />);

    expect(useCalendarBoard).toHaveBeenCalledWith({
      canViewCalendar: true,
      canViewProjects: false,
      canViewStaff: false,
      canViewEquipment: false,
    });
    expect(useTaxComplianceCalendar).toHaveBeenCalledWith(
      '2026-08-01',
      expect.any(String),
      false,
    );
    expect(calendarMocks.schedulablePanelMounted).toBe(false);
    expect(calendarMocks.staffPanelMounted).toBe(false);
    expect((calendarMocks.dndContextProps as { disabled: boolean }).disabled).toBe(true);
  });

  it('allows read-only calendar users to open an event without enabling edits', () => {
    const grants = {
      calendar: { view: true, edit: false },
      projects: { view: true, edit: false },
      staff: { view: false, edit: false },
      equipment: { view: false, edit: false },
    };
    vi.mocked(useWorkspaceAccess).mockReturnValue({
      canAccess: (module: keyof typeof grants, level: 'view' | 'edit') => grants[module][level],
    } as never);
    const event = {
      id: 'event-1',
      projectId: 'project-1',
      title: 'Event',
      notes: null,
      startDate: '2026-08-01',
      endDate: '2026-08-01',
      project: {
        id: 'project-1',
        name: 'Project',
        code: 'P-1',
        image: null,
        status: 'active',
        startDate: null,
        endDate: null,
        color: null,
      },
      days: [{ date: '2026-08-01', startTime: null, endTime: null }],
      staff: [],
      equipment: [],
    };
    vi.mocked(useCalendarBoard).mockReturnValue({
      ...board,
      board: {
        events: [event],
        conflicts: [],
        summary: { errorCount: 0, infoCount: 0, byKind: {} },
      },
    } as never);

    render(<CalendarPage />);

    const monthGridProps = calendarMocks.monthGridProps as {
      onSelectEvent: (selected: typeof event) => void;
    };
    act(() => monthGridProps.onSelectEvent(event));

    expect(calendarMocks.eventEditorProps).toMatchObject({ open: true, canEdit: false });
    expect((calendarMocks.dndContextProps as { disabled: boolean }).disabled).toBe(true);
  });
});
