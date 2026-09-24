import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { findSpanishTaxIds, isValidSpanishTaxId } from '../../../../domain/extraction/tax-id';

interface CorpusPageItem {
  text: string;
}

interface CorpusPage {
  items: CorpusPageItem[];
}

interface CorpusFixture {
  pages: CorpusPage[];
  context?: {
    companyTaxId?: string;
    suppliers?: { name: string; taxId: string }[];
  };
}

const CORPUS_DIR = __dirname;

const fixtureFiles = readdirSync(CORPUS_DIR).filter((file) => file.endsWith('.json') && file !== 'baseline.json');

describe('invoice corpus tax IDs', () => {
  it.each(fixtureFiles)('every tax ID printed in %s is checksum-valid', (fileName) => {
    const fixture = JSON.parse(readFileSync(join(CORPUS_DIR, fileName), 'utf-8')) as CorpusFixture;
    const text = fixture.pages.flatMap((page) => page.items.map((item) => item.text)).join('\n');

    for (const match of findSpanishTaxIds(text)) {
      expect({ file: fileName, taxId: match.value, checksumValid: match.checksumValid }).toEqual({
        file: fileName,
        taxId: match.value,
        checksumValid: true,
      });
    }
  });

  it.each(fixtureFiles)('every context tax ID in %s is checksum-valid', (fileName) => {
    const fixture = JSON.parse(readFileSync(join(CORPUS_DIR, fileName), 'utf-8')) as CorpusFixture;
    const contextTaxIds = [
      fixture.context?.companyTaxId,
      ...(fixture.context?.suppliers?.map((supplier) => supplier.taxId) ?? []),
    ].filter((taxId): taxId is string => Boolean(taxId));

    for (const taxId of contextTaxIds) {
      expect({ file: fileName, taxId, valid: isValidSpanishTaxId(taxId) }).toEqual({
        file: fileName,
        taxId,
        valid: true,
      });
    }
  });
});
