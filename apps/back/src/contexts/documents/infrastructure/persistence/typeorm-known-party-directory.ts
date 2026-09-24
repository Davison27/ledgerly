import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { KnownParty, KnownPartyDirectory } from '../../domain/extraction/known-party-directory.port';
import { canonicalSpanishTaxId } from '../../domain/extraction/tax-id';

interface CompanyTaxIdRow {
  tax_id: string | null;
}

interface SupplierRow {
  name: string;
  tax_id: string;
}

@Injectable()
export class TypeOrmKnownPartyDirectory implements KnownPartyDirectory {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async findCompanyTaxId(): Promise<string | null> {
    const rows: unknown = await this.dataSource.query('SELECT tax_id FROM companies LIMIT 1');
    if (!Array.isArray(rows) || rows.length === 0) return null;

    const taxId = (rows[0] as CompanyTaxIdRow).tax_id;
    return taxId ? canonicalSpanishTaxId(taxId) : null;
  }

  async findActiveSupplierByTaxId(canonicalTaxId: string): Promise<KnownParty | null> {
    const rows: unknown = await this.dataSource.query(
      "SELECT name, tax_id FROM suppliers WHERE archived_at IS NULL AND tax_id IN ($1::text, 'ES' || $1::text) LIMIT 1",
      [canonicalTaxId],
    );
    if (!Array.isArray(rows) || rows.length === 0) return null;

    const row = rows[0] as SupplierRow;
    return { name: row.name, taxId: row.tax_id };
  }
}
