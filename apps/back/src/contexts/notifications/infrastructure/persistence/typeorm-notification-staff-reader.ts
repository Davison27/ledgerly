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
      .createQueryBuilder('staff_document')
      .innerJoin(StaffMemberOrmEntity, 'staff_member', 'staff_member.id = staff_document.staff_member_id')
      .select('staff_document.id', 'id')
      .addSelect('staff_document.staff_member_id', 'staffMemberId')
      .addSelect("staff_member.first_name || ' ' || staff_member.last_name", 'staffMemberName')
      .addSelect('staff_document.name', 'name')
      .addSelect('staff_document.expiry_date::text', 'expiryDate')
      .where('staff_document.expiry_date IS NOT NULL')
      .andWhere('staff_document.expiry_date <= :limitDate', { limitDate })
      .getRawMany<NotificationStaffDocumentRow>();
  }
}
