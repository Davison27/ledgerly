import { Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
import { RequiresNotificationAccess } from '../../../../shared/infrastructure/http/access/requires-notification-access.decorator';
import { ListNotificationsUseCase } from '../../application/list-notifications/list-notifications.use-case';
import { CountUnreadNotificationsUseCase } from '../../application/count-unread-notifications/count-unread-notifications.use-case';
import { MarkNotificationReadUseCase } from '../../application/mark-notification-read/mark-notification-read.use-case';
import { MarkAllNotificationsReadUseCase } from '../../application/mark-all-notifications-read/mark-all-notifications-read.use-case';
import { ResolveNotificationUseCase } from '../../application/resolve-notification/resolve-notification.use-case';
import { ListNotificationsQueryDto } from './dtos/list-notifications.query.dto';
import { NotificationPageResponse } from './notification-page.response';
import { CurrentMember } from '../../../../shared/infrastructure/http/access/current-member.decorator';
import { WorkspaceMember } from '../../../auth/domain/workspace-member';
import { NotificationAccessSnapshot, NotificationPermissionLevel } from '../../domain/notification-access';

function permissionLevel(
  member: WorkspaceMember,
  module: 'projects' | 'calendar' | 'documents' | 'staff' | 'equipment',
): NotificationPermissionLevel {
  if (member.canAccess(module, 'edit')) return 'edit';
  if (member.canAccess(module, 'view')) return 'view';
  return 'none';
}

function notificationAccessFor(member: WorkspaceMember): NotificationAccessSnapshot {
  return {
    projects: permissionLevel(member, 'projects'),
    calendar: permissionLevel(member, 'calendar'),
    documents: permissionLevel(member, 'documents'),
    staff: permissionLevel(member, 'staff'),
    equipment: permissionLevel(member, 'equipment'),
  };
}

@RequiresNotificationAccess()
@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly listNotificationsUseCase: ListNotificationsUseCase,
    private readonly countUnreadNotificationsUseCase: CountUnreadNotificationsUseCase,
    private readonly markNotificationReadUseCase: MarkNotificationReadUseCase,
    private readonly markAllNotificationsReadUseCase: MarkAllNotificationsReadUseCase,
    private readonly resolveNotificationUseCase: ResolveNotificationUseCase,
  ) {}

  @Get()
  async list(
    @Query() query: ListNotificationsQueryDto,
    @CurrentMember() member: WorkspaceMember,
  ): Promise<NotificationPageResponse> {
    const page = await this.listNotificationsUseCase.execute({
      page: query.page,
      size: query.size,
      status: query.status,
      access: notificationAccessFor(member),
    });

    return NotificationPageResponse.fromPage(page);
  }

  @Get('unread-count')
  async unreadCount(@CurrentMember() member: WorkspaceMember): Promise<{ count: number }> {
    const count = await this.countUnreadNotificationsUseCase.execute(notificationAccessFor(member));

    return { count };
  }

  @Post('read-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  async markAllRead(@CurrentMember() member: WorkspaceMember): Promise<void> {
    await this.markAllNotificationsReadUseCase.execute(notificationAccessFor(member));
  }

  @Post(':id/read')
  @HttpCode(HttpStatus.NO_CONTENT)
  async markRead(@Param('id') id: string, @CurrentMember() member: WorkspaceMember): Promise<void> {
    await this.markNotificationReadUseCase.execute({ id, access: notificationAccessFor(member) });
  }

  @Post(':id/resolve')
  @HttpCode(HttpStatus.NO_CONTENT)
  async resolve(@Param('id') id: string, @CurrentMember() member: WorkspaceMember): Promise<void> {
    await this.resolveNotificationUseCase.execute(id, notificationAccessFor(member));
  }
}
