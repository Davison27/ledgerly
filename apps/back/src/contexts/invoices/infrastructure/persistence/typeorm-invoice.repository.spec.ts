import { Repository } from 'typeorm';
import { TypeOrmInvoiceRepository } from './typeorm-invoice.repository';
import { InvoiceOrmEntity } from './invoice.orm-entity';
import { InvoiceLineOrmEntity } from './invoice-line.orm-entity';
import { createStoredFileCipher } from '../../../../shared/infrastructure/crypto/stored-file-cipher';
import { STORED_FILE_PLAINTEXT_LIMITS } from '../../../../shared/infrastructure/crypto/stored-file-policy';
import { StoredFileCipher } from '../../../../shared/domain/stored-file-cipher.port';
import { StoredFileCryptographyException } from '../../../../shared/domain/errors/stored-file-cryptography.exception';

function createStoredFileCipherForTest(keyByte = 1): StoredFileCipher {
  return createStoredFileCipher({
    activeVersion: 'v1',
    keys: new Map([['v1', Buffer.alloc(32, keyByte)]]),
  });
}

function buildStoredInvoice(): InvoiceOrmEntity {
  return {
    id: 'invoice-1',
    pdfCiphertext: null,
    pdfNonce: null,
    pdfTag: null,
    pdfKeyVersion: null,
    pdfSize: null,
  } as InvoiceOrmEntity;
}

function createStoredInvoiceRepository(invoice: InvoiceOrmEntity): {
  repository: TypeOrmInvoiceRepository;
  ormRepository: { createQueryBuilder: jest.Mock; update: jest.Mock; delete: jest.Mock };
  queryBuilder: { select: jest.Mock; addSelect: jest.Mock; where: jest.Mock };
} {
  const queryBuilder = {
    select: jest.fn(),
    addSelect: jest.fn(),
    where: jest.fn(),
    getOne: jest.fn().mockImplementation(() => Promise.resolve(invoice)),
  };
  queryBuilder.select.mockReturnValue(queryBuilder);
  queryBuilder.addSelect.mockReturnValue(queryBuilder);
  queryBuilder.where.mockReturnValue(queryBuilder);

  const ormRepository = {
    createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    update: jest.fn((_criteria: unknown, values: Partial<InvoiceOrmEntity>) => {
      Object.assign(invoice, values);
      return Promise.resolve({ affected: 1 });
    }),
    delete: jest.fn().mockImplementation(() => {
      queryBuilder.getOne.mockResolvedValue(null);
      return Promise.resolve({ affected: 1 });
    }),
  };

  return {
    repository: new TypeOrmInvoiceRepository(
      {} as never,
      ormRepository as unknown as Repository<InvoiceOrmEntity>,
      {} as Repository<InvoiceLineOrmEntity>,
      { generate: () => 'line-1' },
      createStoredFileCipherForTest(),
    ),
    ormRepository,
    queryBuilder,
  };
}

describe('TypeOrmInvoiceRepository', () => {
  describe('stored PDF', () => {
    it('encrypts persisted PDF bytes and decrypts the complete explicitly selected envelope', async () => {
      const invoice = buildStoredInvoice();
      const { repository, ormRepository, queryBuilder } = createStoredInvoiceRepository(invoice);
      const plaintext = Buffer.from('%PDF');

      await repository.savePdf(invoice.id, plaintext);

      expect(invoice.pdfCiphertext).not.toEqual(plaintext);
      expect(invoice.pdfNonce).toHaveLength(12);
      expect(invoice.pdfTag).toHaveLength(16);
      expect(invoice.pdfKeyVersion).toBe('v1');
      expect(invoice.pdfSize).toBe(plaintext.length);
      await expect(repository.findPdf(invoice.id)).resolves.toEqual(plaintext);
      expect(queryBuilder.select).toHaveBeenCalledWith(['invoice.id', 'invoice.pdfSize']);
      expect(queryBuilder.addSelect).toHaveBeenCalledWith('invoice.pdfCiphertext');
      expect(queryBuilder.addSelect).toHaveBeenCalledWith('invoice.pdfNonce');
      expect(queryBuilder.addSelect).toHaveBeenCalledWith('invoice.pdfTag');
      expect(queryBuilder.addSelect).toHaveBeenCalledWith('invoice.pdfKeyVersion');
      expect(ormRepository.update).toHaveBeenCalledTimes(1);
    });

    it('accepts a PDF at the central plaintext limit', async () => {
      const invoice = buildStoredInvoice();
      const { repository } = createStoredInvoiceRepository(invoice);
      const plaintext = Buffer.alloc(STORED_FILE_PLAINTEXT_LIMITS.invoicePdf, 1);

      await repository.savePdf(invoice.id, plaintext);

      const decrypted = await repository.findPdf(invoice.id);

      expect(decrypted?.equals(plaintext)).toBe(true);
    });

    it('rejects a PDF one byte over the central plaintext limit without mutating persistence', async () => {
      const invoice = buildStoredInvoice();
      const { repository, ormRepository } = createStoredInvoiceRepository(invoice);

      await expect(
        repository.savePdf(
          invoice.id,
          Buffer.alloc(STORED_FILE_PLAINTEXT_LIMITS.invoicePdf + 1),
        ),
      ).rejects.toThrow(StoredFileCryptographyException);

      expect(invoice.pdfCiphertext).toBeNull();
      expect(invoice.pdfNonce).toBeNull();
      expect(invoice.pdfTag).toBeNull();
      expect(invoice.pdfKeyVersion).toBeNull();
      expect(invoice.pdfSize).toBeNull();
      expect(ormRepository.update).not.toHaveBeenCalled();
    });

    it('returns null when every PDF envelope field is null', async () => {
      const invoice = buildStoredInvoice();
      const { repository } = createStoredInvoiceRepository(invoice);

      await expect(repository.findPdf(invoice.id)).resolves.toBeNull();
    });

    it.each([
      'pdfCiphertext',
      'pdfNonce',
      'pdfTag',
      'pdfKeyVersion',
      'pdfSize',
    ] as const)('rejects a partial PDF envelope missing %s', async (missingField) => {
      const invoice = buildStoredInvoice();
      const { repository } = createStoredInvoiceRepository(invoice);
      await repository.savePdf(invoice.id, Buffer.from('%PDF'));
      Object.assign(invoice, { [missingField]: null });

      await expect(repository.findPdf(invoice.id)).rejects.toThrow(StoredFileCryptographyException);
    });

    it.each(['pdfCiphertext', 'pdfNonce', 'pdfTag'] as const)(
      'rejects tampering with %s',
      async (field) => {
        const invoice = buildStoredInvoice();
        const { repository } = createStoredInvoiceRepository(invoice);
        await repository.savePdf(invoice.id, Buffer.from('%PDF'));
        invoice[field] = Buffer.from(invoice[field] as Buffer);
        invoice[field][0] ^= 0xff;

        await expect(repository.findPdf(invoice.id)).rejects.toThrow(StoredFileCryptographyException);
      },
    );

    it.each([
      ['pdfKeyVersion', 'v2'],
      ['pdfSize', 3],
    ] as const)('rejects tampering with persisted %s metadata', async (field, value) => {
      const invoice = buildStoredInvoice();
      const { repository } = createStoredInvoiceRepository(invoice);
      await repository.savePdf(invoice.id, Buffer.from('%PDF'));
      Object.assign(invoice, { [field]: value });

      await expect(repository.findPdf(invoice.id)).rejects.toThrow(StoredFileCryptographyException);
    });

    it('rejects a PDF encrypted with a different key for the same version', async () => {
      const invoice = buildStoredInvoice();
      const { repository } = createStoredInvoiceRepository(invoice);
      const otherCipher = createStoredFileCipherForTest(2);
      const plaintext = Buffer.from('%PDF');
      const envelope = otherCipher.encrypt(plaintext, {
        store: 'invoicePdf',
        rowId: invoice.id,
        mimeType: 'application/pdf',
        plaintextSize: plaintext.length,
      });
      Object.assign(invoice, {
        pdfCiphertext: envelope.ciphertext,
        pdfNonce: envelope.nonce,
        pdfTag: envelope.tag,
        pdfKeyVersion: envelope.version,
        pdfSize: plaintext.length,
      });

      await expect(repository.findPdf(invoice.id)).rejects.toThrow(StoredFileCryptographyException);
    });

    it('deletes the invoice row and its encrypted PDF envelope', async () => {
      const invoice = buildStoredInvoice();
      const { repository } = createStoredInvoiceRepository(invoice);
      await repository.savePdf(invoice.id, Buffer.from('%PDF'));

      await repository.delete(invoice.id);

      await expect(repository.findPdf(invoice.id)).resolves.toBeNull();
    });
  });
});
