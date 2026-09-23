import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { createElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ScheduleEditorBoardDto } from '@/entities/schedule-event';
import type { CalendarEvent } from './calendarEditorData';
import { useCalendarBoard } from './useCalendarBoard';

const apiMocks = vi.hoisted(() => ({
  getScheduleBoard: vi.fn(),
  getCalendarEditorBoard: vi.fn(),
  listSchedulableProjects: vi.fn(),
  listCalendarEditorProjects: vi.fn(),
  listCalendarEditorStaff: vi.fn(),
  listCalendarEditorEquipment: vi.fn(),
  createScheduleEvent: vi.fn(),
  updateScheduleEvent: vi.fn(),
  deleteScheduleEvent: vi.fn(),
  listStaffMembers: vi.fn(),
  listEquipment: vi.fn(),
}));

vi.mock('@/entities/schedule-event/api/schedule.api', () => ({
  getScheduleBoard: apiMocks.getScheduleBoard,
  getCalendarEditorBoard: apiMocks.getCalendarEditorBoard,
  listSchedulableProjects: apiMocks.listSchedulableProjects,
  listCalendarEditorProjects: apiMocks.listCalendarEditorProjects,
  listCalendarEditorStaff: apiMocks.listCalendarEditorStaff,
  listCalendarEditorEquipment: apiMocks.listCalendarEditorEquipment,
  createScheduleEvent: apiMocks.createScheduleEvent,
  updateScheduleEvent: apiMocks.updateScheduleEvent,
  deleteScheduleEvent: apiMocks.deleteScheduleEvent,
  listScheduleEvents: vi.fn(),
}));

vi.mock('@/entities/staff-member', () => ({
  staffQueries: {
    list: () => ({ queryKey: ['staff', 'list'], queryFn: apiMocks.listStaffMembers }),
  },
}));

vi.mock('@/entities/equipment', () => ({
  equipmentQueries: {
    list: () => ({ queryKey: ['equipment', 'list'], queryFn: apiMocks.listEquipment }),
  },
}));

function editorBoard(title: string | null = null, includeCreated = false): ScheduleEditorBoardDto {
  const events = [
    {
      id: 'event-1',
      projectId: 'project-1',
      title,
      notes: null,
      startDate: '2026-03-02',
      endDate: '2026-03-02',
      project: { id: 'project-1', displayName: 'Project One' },
      days: [{ date: '2026-03-02', startTime: null, endTime: null }],
      staff: [{ id: 'staff-1', displayName: 'Alex Rivera' }],
      equipment: [{ id: 'equipment-1', displayName: 'Lift', quantity: 1 }],
    },
  ];
  if (includeCreated) {
    events.push({
      id: 'event-created',
      projectId: 'project-1',
      title: null,
      notes: null,
      startDate: '2026-03-03',
      endDate: '2026-03-03',
      project: { id: 'project-1', displayName: 'Project One' },
      days: [{ date: '2026-03-03', startTime: null, endTime: null }],
      staff: [],
      equipment: [],
    });
  }
  return events;
}

function fullBoard(title: string | null = null) {
  return {
    events: [
      {
        id: 'event-1',
        projectId: 'project-1',
        title,
        notes: null,
        startDate: '2026-03-02',
        endDate: '2026-03-02',
        project: {
          id: 'project-1',
          name: 'Project One',
          code: 'P-1',
          image: null,
          status: 'active',
          startDate: '2026-03-01',
          endDate: '2026-03-05',
          color: null,
        },
        days: [{ date: '2026-03-02', startTime: null, endTime: null }],
        staff: [],
        equipment: [],
      },
    ],
    conflicts: [],
    summary: {
      errorCount: 0,
      infoCount: 0,
      byKind: {
        staff_not_hired: 0,
        outside_project_dates: 0,
        staff_overlap: 0,
        project_not_active: 0,
        equipment_overallocated: 0,
        equipment_stock_unset: 0,
      },
    },
  };
}

function renderCalendarBoard(options: {
  canViewCalendar: boolean;
  canEditCalendar: boolean;
  canViewProjects: boolean;
  canViewStaff: boolean;
  canViewEquipment: boolean;
}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
  return renderHook(() => useCalendarBoard(options), { wrapper });
}

describe('useCalendarBoard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiMocks.getCalendarEditorBoard.mockResolvedValue(editorBoard());
    apiMocks.getScheduleBoard.mockResolvedValue(fullBoard());
    apiMocks.listCalendarEditorProjects.mockResolvedValue([
      { id: 'project-1', displayName: 'Project One' },
    ]);
    apiMocks.listCalendarEditorStaff.mockResolvedValue([
      { id: 'staff-1', displayName: 'Alex Rivera' },
    ]);
    apiMocks.listCalendarEditorEquipment.mockResolvedValue([
      { id: 'equipment-1', displayName: 'Lift' },
    ]);
    apiMocks.listSchedulableProjects.mockResolvedValue([]);
    apiMocks.listStaffMembers.mockResolvedValue([]);
    apiMocks.listEquipment.mockResolvedValue([]);
    apiMocks.createScheduleEvent.mockResolvedValue({ id: 'event-created' });
    apiMocks.updateScheduleEvent.mockResolvedValue({ id: 'event-1' });
    apiMocks.deleteScheduleEvent.mockResolvedValue(undefined);
  });

  it('uses only schedule editor routes when a linked section has no view grant', async () => {
    const { result } = renderCalendarBoard({
      canViewCalendar: true,
      canEditCalendar: true,
      canViewProjects: false,
      canViewStaff: false,
      canViewEquipment: false,
    });

    await waitFor(() => expect(apiMocks.getCalendarEditorBoard).toHaveBeenCalledOnce());
    await waitFor(() => expect(result.current.equipment).toEqual([
      { id: 'equipment-1', displayName: 'Lift' },
    ]));

    expect(apiMocks.listCalendarEditorProjects).toHaveBeenCalledOnce();
    expect(apiMocks.listCalendarEditorStaff).toHaveBeenCalledOnce();
    expect(apiMocks.listCalendarEditorEquipment).toHaveBeenCalledOnce();
    expect(apiMocks.getScheduleBoard).not.toHaveBeenCalled();
    expect(apiMocks.listSchedulableProjects).not.toHaveBeenCalled();
    expect(apiMocks.listStaffMembers).not.toHaveBeenCalled();
    expect(apiMocks.listEquipment).not.toHaveBeenCalled();
    expect(result.current.projects).toEqual([{ id: 'project-1', displayName: 'Project One' }]);
    expect(result.current.staffMembers).toEqual([{ id: 'staff-1', displayName: 'Alex Rivera' }]);
  });

  it('uses full views when linked sections are visible and writes with Calendar edit', async () => {
    apiMocks.getScheduleBoard.mockResolvedValueOnce(fullBoard()).mockResolvedValue(fullBoard('Updated'));
    const { result } = renderCalendarBoard({
      canViewCalendar: true,
      canEditCalendar: true,
      canViewProjects: true,
      canViewStaff: true,
      canViewEquipment: true,
    });

    await waitFor(() => expect(apiMocks.getScheduleBoard).toHaveBeenCalledOnce());
    let updated: Awaited<ReturnType<typeof result.current.saveEvent>> | undefined;
    await act(async () => {
      updated = await result.current.saveEvent('event-1', { title: 'Updated' });
    });

    expect(apiMocks.getCalendarEditorBoard).not.toHaveBeenCalled();
    expect(apiMocks.listCalendarEditorProjects).not.toHaveBeenCalled();
    expect(apiMocks.listCalendarEditorStaff).not.toHaveBeenCalled();
    expect(apiMocks.listCalendarEditorEquipment).not.toHaveBeenCalled();
    expect(apiMocks.updateScheduleEvent).toHaveBeenCalledWith('event-1', { title: 'Updated' });
    expect(updated?.title).toBe('Updated');
  });

  it('invalidates active schedule queries and resolves mutation results by event id', async () => {
    const boards = [editorBoard(), editorBoard(null, true), editorBoard('Updated'), []];
    apiMocks.getCalendarEditorBoard.mockImplementation(async () => boards.shift() ?? []);
    const { result } = renderCalendarBoard({
      canViewCalendar: true,
      canEditCalendar: true,
      canViewProjects: false,
      canViewStaff: false,
      canViewEquipment: false,
    });
    await waitFor(() => expect(result.current.board?.events).toHaveLength(1));

    await act(async () => result.current.createFromDrop('project-1', '2026-03-03'));
    await waitFor(() => expect(result.current.board?.events).toHaveLength(2));
    expect(apiMocks.createScheduleEvent).toHaveBeenCalledOnce();

    let updated: Awaited<ReturnType<typeof result.current.saveEvent>> | undefined;
    await act(async () => {
      updated = await result.current.saveEvent('event-1', { title: 'Updated' });
    });
    expect(updated?.title).toBe('Updated');

    await act(async () => result.current.removeEvent('event-created'));
    await waitFor(() => expect(result.current.board?.events).toEqual([]));
    expect(apiMocks.deleteScheduleEvent).toHaveBeenCalledWith('event-created');
    expect(apiMocks.getCalendarEditorBoard).toHaveBeenCalledTimes(4);
  });

  it('returns the refetched event for a created derived range', async () => {
    const createdBoard = {
      ...fullBoard(),
      events: [
        {
          ...fullBoard().events[0],
          id: 'event-derived',
          title: null,
          startDate: '2026-03-02',
          endDate: '2026-03-04',
          days: [
            { date: '2026-03-02', startTime: null, endTime: null },
            { date: '2026-03-03', startTime: null, endTime: null },
            { date: '2026-03-04', startTime: null, endTime: null },
          ],
        },
      ],
    };
    apiMocks.getScheduleBoard.mockResolvedValueOnce(fullBoard()).mockResolvedValue(createdBoard);
    apiMocks.createScheduleEvent.mockResolvedValue({ id: 'event-derived' });
    const { result } = renderCalendarBoard({
      canViewCalendar: true,
      canEditCalendar: true,
      canViewProjects: true,
      canViewStaff: true,
      canViewEquipment: true,
    });
    await waitFor(() => expect(result.current.board).not.toBeNull());

    const resultState: { created: CalendarEvent | null } = { created: null };
    await act(async () => {
      resultState.created = await result.current.materializeDerivedRange(
        {
          id: 'project-1',
          displayName: 'Project One',
          status: 'active',
          startDate: '2026-03-02',
          endDate: '2026-03-04',
          hasEvents: false,
        },
        0,
      );
    });

    expect(resultState.created?.id).toBe('event-derived');
    expect(apiMocks.getScheduleBoard).toHaveBeenCalledTimes(2);
  });
});
