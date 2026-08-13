import { Inject, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { CLOCK, Clock } from '../../../../shared/domain/clock.port';
import {
  InvoiceDocumentPaymentStatus,
  InvoicePaymentStatus,
  InvoicePaymentStatusProvider,
} from '../../domain/invoice-payment-status.port';

@Injectable()
export class DocumentPaymentStatusProvider implements InvoicePaymentStatusProvider {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async findByDocumentIds(documentIds: string[]): Promise<InvoiceDocumentPaymentStatus[]> {
    if (documentIds.length === 0) {
      return [];
    }

    const rows: Array<{ documentId: string; status: InvoicePaymentStatus }> =
      await this.dataSource.query(
        `
        SELECT id AS "documentId",
               CASE WHEN status = 'pendiente' AND due_date IS NOT NULL AND due_date < $2
                    THEN 'vencido' ELSE status END AS status
        FROM documents
        WHERE id = ANY($1)
        `,
        [documentIds, this.clock.todayIso()],
      );

    return rows;
  }
}
