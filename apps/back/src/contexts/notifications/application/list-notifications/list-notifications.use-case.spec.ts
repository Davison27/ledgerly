import { NotificationAccessSnapshot } from '../../domain/notification-access';
import { NotificationRepository } from '../../domain/notification.repository';
import { NotificationListRow } from '../../domain/notification-list-row';
import { Page } from '../../../../shared/domain/pagination';
import { ListNotificationsUseCase } from './list-notifications.use-case';
import { ListNotificationsQuery } from './list-notifications.query';

const ACCESS: NotificationAccessSnapshot = {
  projects: 'view',
  calendar: 'none',
  documents: 'view',
  staff: 'none',
  equipment: 'none',
};

describe('ListNotificationsUseCase', () => {
  it('uses one member access snapshot for page and unread count', async () => {
    const page: Page<NotificationListRow> = { items: [], total: 2, page: 1, size: 20 };
    const findPage = jest.fn(() => Promise.resolve(page));
    const countUnread = jest.fn(() => Promise.resolve(1));
    const repository = {
      findPage,
      countUnread,
    } as unknown as NotificationRepository;
    const query: ListNotificationsQuery = { page: 1, size: 20, status: 'open', access: ACCESS };
    const useCase = new ListNotificationsUseCase(repository);

    await expect(useCase.execute(query)).resolves.toEqual({ ...page, unreadCount: 1 });
    expect(findPage).toHaveBeenCalledWith(query);
    expect(countUnread).toHaveBeenCalledWith(ACCESS);
  });
});
