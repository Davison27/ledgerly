import { describe, expect, it } from 'vitest';
import type {
  ScheduleBoardDto,
  ScheduleEditorBoardDto,
  ScheduleEditorEventDto,
  ScheduleEditorSelectorDto,
  SchedulableProjectDto,
} from '@/entities/schedule-event';
import {
  mapEditorCalendarBoard,
  mapFullCalendarBoard,
  mapFullProjectOption,
  mapSelectorOption,
} from './calendarEditorData';

describe('calendar editor data', () => {
  it('maps minimal event and selector data without manufacturing master fields', () => {
    const event: ScheduleEditorEventDto = {
      id: 'event-1',
      projectId: 'project-1',
      title: null,
      notes: null,
      startDate: '2026-03-02',
      endDate: '2026-03-02',
      project: { id: 'project-1', displayName: 'Project One' },
      days: [{ date: '2026-03-02', startTime: null, endTime: null }],
      staff: [{ id: 'staff-1', displayName: 'Alex Rivera' }],
      equipment: [{ id: 'equipment-1', displayName: 'Lift', quantity: 2 }],
    };
    const source: ScheduleEditorBoardDto = [event];
    const selector: ScheduleEditorSelectorDto = { id: 'project-1', displayName: 'Project One' };

    const board = mapEditorCalendarBoard(source);

    expect(Array.isArray(source)).toBe(true);
    expect(board.events[0]).toEqual(event);
    expect(board.events[0].projectId).toBe('project-1');
    expect(mapSelectorOption(selector)).toEqual({ id: 'project-1', displayName: 'Project One' });
    expect('status' in board.events[0].project).toBe(false);
  });

  it('normalizes full board staff and equipment while retaining project identifiers', () => {
    const source: ScheduleBoardDto = {
      events: [
        {
          id: 'event-1',
          projectId: 'project-1',
          title: 'Install',
          notes: null,
          startDate: '2026-03-02',
          endDate: '2026-03-02',
          project: {
            id: 'project-1',
            name: 'Project One',
            code: 'P-1',
            image: null,
            status: 'active',
            startDate: null,
            endDate: null,
            color: null,
          },
          days: [{ date: '2026-03-02', startTime: null, endTime: null }],
          staff: [{ id: 'staff-1', firstName: 'Alex', lastName: 'Rivera' }],
          equipment: [{ equipmentId: 'equipment-1', name: 'Lift', quantity: 2, stock: 4 }],
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

    expect(mapFullCalendarBoard(source).events[0]).toMatchObject({
      projectId: 'project-1',
      project: { id: 'project-1', displayName: 'Project One', status: 'active' },
      staff: [{ id: 'staff-1', displayName: 'Alex Rivera' }],
      equipment: [{ id: 'equipment-1', displayName: 'Lift', quantity: 2, stock: 4 }],
    });
  });

  it('retains full project metadata only when it is available from the authorized selector', () => {
    const project: SchedulableProjectDto = {
      id: 'project-1',
      name: 'Project One',
      code: 'P-1',
      image: null,
      status: 'active',
      startDate: '2026-03-02',
      endDate: '2026-03-03',
      color: null,
      hasEvents: false,
    };

    expect(mapFullProjectOption(project)).toEqual({
      id: 'project-1',
      displayName: 'Project One',
      code: 'P-1',
      image: null,
      status: 'active',
      startDate: '2026-03-02',
      endDate: '2026-03-03',
      color: null,
      hasEvents: false,
    });
  });
});
