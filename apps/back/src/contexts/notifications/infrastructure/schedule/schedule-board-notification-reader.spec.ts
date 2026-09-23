import { GetScheduleBoardUseCase, ScheduleBoard } from '../../../schedule/application/get-schedule-board/get-schedule-board.use-case';
import { ScheduleBoardNotificationReader } from './schedule-board-notification-reader';

describe('ScheduleBoardNotificationReader', () => {
  it('uses full trusted schedule access while generating notification candidates', async () => {
    const board: ScheduleBoard = { events: [], conflicts: [], summary: {} as ScheduleBoard['summary'] };
    const execute = jest.fn(() => Promise.resolve(board));
    const reader = new ScheduleBoardNotificationReader({ execute } as unknown as GetScheduleBoardUseCase);

    await reader.findUpcomingEvents('2026-09-23', '2026-09-30');
    await reader.findBlockingConflicts('2026-09-23', '2026-09-30');

    expect(execute).toHaveBeenNthCalledWith(
      1,
      { from: '2026-09-23', to: '2026-09-30' },
      { projects: 'edit', staff: 'edit', equipment: 'edit' },
    );
    expect(execute).toHaveBeenNthCalledWith(
      2,
      { from: '2026-09-23', to: '2026-09-30' },
      { projects: 'edit', staff: 'edit', equipment: 'edit' },
    );
  });
});
