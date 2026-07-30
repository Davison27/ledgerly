import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Notification } from '../../domain/notification';
import { NotificationPageQuery, NotificationRepository } from '../../domain/notification.repository';
import { NotificationListRow } from '../../domain/notification-list-row';
import { Page } from '../../../../shared/domain/pagination';
import { NotificationOrmEntity } from './notification.orm-entity';
import { NotificationMapper } from './notification.mapper';

const SEVERITY_ORDER_SQL = "CASE notification.severity WHEN 'error' THEN 0 WHEN 'warning' THEN 1 ELSE 2 END";

@Injectable()
export class TypeOrmNotificationRepository implements NotificationRepository {
  constructor(
    @InjectRepository(NotificationOrmEntity) private readonly repository: Repository<NotificationOrmEntity>,
  ) {}

  async insertIfAbsent(notifications: Notification[]): Promise<Notification[]> {
    if (notifications.length === 0) {
      return [];
    }

    const rows = notifications.map((notification) => NotificationMapper.toOrm(notification));

    const result = await this.repository
      .createQueryBuilder()
      .insert()
      .into(NotificationOrmEntity)
      .values(rows)
      .orIgnore()
      .returning(['id'])
      .execute();

    const insertedIds = new Set((result.raw as Array<{ id: string }>).map((row) => row.id));

    return notifications.filter((notification) => insertedIds.has(notification.getId()));
  }

  async findById(id: string): Promise<Notification | null> {
    const orm = await this.repository.findOne({ where: { id } });

    return orm ? NotificationMapper.toDomain(orm) : null;
  }

  async save(notification: Notification): Promise<void> {
    await this.repository.save(NotificationMapper.toOrm(notification));
  }

  async findPage(query: NotificationPageQuery): Promise<Page<NotificationListRow>> {
    const queryBuilder = this.repository.createQueryBuilder('notification');

    if (query.status === 'unread') {
      queryBuilder.andWhere('notification.read_at IS NULL AND notification.resolved_at IS NULL');
    } else if (query.status === 'open') {
      queryBuilder.andWhere('notification.resolved_at IS NULL');
    } else if (query.status === 'resolved') {
      queryBuilder.andWhere('notification.resolved_at IS NOT NULL');
    }

    const total = await queryBuilder.getCount();

    const orms = await queryBuilder
      .orderBy(SEVERITY_ORDER_SQL)
      .addOrderBy('notification.created_at', 'DESC')
      .limit(query.size)
      .offset((query.page - 1) * query.size)
      .getMany();

    return {
      items: orms.map((orm) => NotificationMapper.toListRow(orm)),
      total,
      page: query.page,
      size: query.size,
    };
  }

  countUnread(): Promise<number> {
    return this.repository.count({ where: { readAt: IsNull(), resolvedAt: IsNull() } });
  }

  async markAllRead(readAt: Date): Promise<void> {
    await this.repository
      .createQueryBuilder()
      .update(NotificationOrmEntity)
      .set({ readAt })
      .where('read_at IS NULL')
      .execute();
  }

  async resolveActiveExcept(types: string[], activeDedupeKeys: string[], resolvedAt: Date): Promise<void> {
    if (types.length === 0) return;

    const query = this.repository
      .createQueryBuilder()
      .update(NotificationOrmEntity)
      .set({ resolvedAt, readAt: () => 'COALESCE(read_at, :resolvedAt)' })
      .where('resolved_at IS NULL')
      .andWhere('type IN (:...types)', { types, resolvedAt });

    if (activeDedupeKeys.length > 0) {
      query.andWhere('dedupe_key NOT IN (:...activeDedupeKeys)', { activeDedupeKeys });
    }

    await query.execute();
  }

  async deleteReadBefore(threshold: Date): Promise<number> {
    const result = await this.repository
      .createQueryBuilder()
      .delete()
      .from(NotificationOrmEntity)
      .where('read_at IS NOT NULL AND read_at < :threshold', { threshold })
      .execute();

    return result.affected ?? 0;
  }
}
