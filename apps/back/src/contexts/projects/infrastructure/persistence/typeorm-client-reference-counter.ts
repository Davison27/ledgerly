import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ClientReferenceCounter } from '../../domain/client-reference-counter.port';

@Injectable()
export class TypeOrmClientReferenceCounter implements ClientReferenceCounter {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async count(clientId: string): Promise<number> {
    const rows: unknown = await this.dataSource.query(
      'SELECT count(*)::int AS count FROM projects WHERE client_id = $1',
      [clientId],
    );

    return Array.isArray(rows) && rows.length > 0 ? Number((rows[0] as { count: number }).count) : 0;
  }
}
