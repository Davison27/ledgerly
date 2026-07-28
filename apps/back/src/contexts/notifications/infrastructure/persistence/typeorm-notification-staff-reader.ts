import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StaffDocumentOrmEntity } from '../../../staff/infrastructure/persistence/staff-document.orm-entity';
import { StaffMemberOrmEntity } from '../../../staff/infrastructure/persistence/staff-member.orm-entity';
import {
  NotificationStaffDocumentRow,
  NotificationStaffReader,
} from '../../domain/notification-staff-reader.port';

@Injectable()
export class TypeOrmNotificationStaffReader implements NotificationStaffReader {
  constructor(
    @InjectRepository(StaffDocumentOrmEntity)
    private readonly repository: Repository<StaffDocumentOrmEntity>,
  ) {}

  findExpiringUpTo(limitDate: string): Promise<NotificationStaffDocumentRow[]> {
    return this.repository
      .createQueryBuilder('staffDocument')
      .innerJoin(StaffMemberOrmEntity, 'staffMember', 'staffMember.id = staffDocument.staff_member_id')
      .select('staffDocument.id', 'id')
      .addSelect('staffDocument.staff_member_id', 'staffMemberId')
      .addSelect("staffMember.first_name || ' ' || staffMember.last_name", 'staffMemberName')
      .addSelect('staffDocument.name', 'name')
      .addSelect('staffDocument.expiry_date::text', 'expiryDate')
      .where('staffDocument.expiry_date IS NOT NULL')
      .andWhere('staffDocument.expiry_date <= :limitDate', { limitDate })
      .getRawMany<NotificationStaffDocumentRow>();
  }
}
