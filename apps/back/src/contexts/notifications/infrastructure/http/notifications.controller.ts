import { Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
import { Authenticated } from '../../../../shared/infrastructure/http/access/authenticated.decorator';
import { ListNotificationsUseCase } from '../../application/list-notifications/list-notifications.use-case';
import { CountUnreadNotificationsUseCase } from '../../application/count-unread-notifications/count-unread-notifications.use-case';
import { MarkNotificationReadUseCase } from '../../application/mark-notification-read/mark-notification-read.use-case';
import { MarkAllNotificationsReadUseCase } from '../../application/mark-all-notifications-read/mark-all-notifications-read.use-case';
import { ListNotificationsQueryDto } from './dtos/list-notifications.query.dto';
import { NotificationPageResponse } from './notification-page.response';

@Authenticated()
@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly listNotificationsUseCase: ListNotificationsUseCase,
    private readonly countUnreadNotificationsUseCase: CountUnreadNotificationsUseCase,
    private readonly markNotificationReadUseCase: MarkNotificationReadUseCase,
    private readonly markAllNotificationsReadUseCase: MarkAllNotificationsReadUseCase,
  ) {}

  @Get()
  async list(@Query() query: ListNotificationsQueryDto): Promise<NotificationPageResponse> {
    const page = await this.listNotificationsUseCase.execute({
      page: query.page,
      size: query.size,
      onlyUnread: query.status === 'unread',
    });

    return NotificationPageResponse.fromPage(page);
  }

  @Get('unread-count')
  async unreadCount(): Promise<{ count: number }> {
    const count = await this.countUnreadNotificationsUseCase.execute();

    return { count };
  }

  @Post('read-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  async markAllRead(): Promise<void> {
    await this.markAllNotificationsReadUseCase.execute();
  }

  @Post(':id/read')
  @HttpCode(HttpStatus.NO_CONTENT)
  async markRead(@Param('id') id: string): Promise<void> {
    await this.markNotificationReadUseCase.execute({ id });
  }
}
