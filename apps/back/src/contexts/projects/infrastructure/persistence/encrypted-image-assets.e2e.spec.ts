import { randomUUID } from 'node:crypto';
import { DataSource } from 'typeorm';
import { InitialLedgerlySchema1730000000000 } from '../../../../database/migrations/1730000000000-InitialLedgerlySchema';
import { AddListQueryIndexes1730000001000 } from '../../../../database/migrations/1730000001000-AddListQueryIndexes';
import { AddEncryptedStoredFileEnvelopes1730000002000 } from '../../../../database/migrations/1730000002000-AddEncryptedStoredFileEnvelopes';
import { createStoredFileCipher } from '../../../../shared/infrastructure/crypto/stored-file-cipher';
import { Company } from '../../../company/domain/company';
import { GetCompanyBrandingUseCase } from '../../../company/application/get-company-branding/get-company-branding.use-case';
import { CompanyOrmEntity } from '../../../company/infrastructure/persistence/company.orm-entity';
import { TypeOrmCompanyRepository } from '../../../company/infrastructure/persistence/typeorm-company.repository';
import { Product } from '../../../products/domain/product';
import { ProductOrmEntity } from '../../../products/infrastructure/persistence/product.orm-entity';
import { TypeOrmProductRepository } from '../../../products/infrastructure/persistence/typeorm-product.repository';
import { TypeOrmScheduleProjectReader } from '../../../schedule/infrastructure/persistence/typeorm-schedule-project-reader';
import { UpdateProjectUseCase } from '../../application/update-project/update-project.use-case';
import { Project } from '../../domain/project';
import { ProjectOrmEntity } from './project.orm-entity';
import { ProjectProductOrmEntity } from './project-product.orm-entity';
import { TypeOrmProjectProductRepository } from './typeorm-project-product.repository';
import { TypeOrmProjectRepository } from './typeorm-project.repository';

const pngBytes = Buffer.from('89504e470d0a1a0a00000000', 'hex');
const image = `data:image/png;base64,${pngBytes.toString('base64')}`;
const projectId = '00000000-0000-0000-0000-000000000005';
const productId = '00000000-0000-0000-0000-000000000006';
const companyId = '00000000-0000-0000-0000-000000000004';

describe('encrypted image assets (PostgreSQL)', () => {
  let administrator: DataSource;
  let companyRepository: TypeOrmCompanyRepository;
  let dataSource: DataSource;
  let productRepository: TypeOrmProductRepository;
  let projectProductRepository: TypeOrmProjectProductRepository;
  let projectRepository: TypeOrmProjectRepository;
  let scheduleProjectReader: TypeOrmScheduleProjectReader;
  let schema: string;

  beforeAll(async () => {
    const databaseUrl = parseMigrationTestDatabaseUrl(process.env.LEDGERLY_MIGRATION_TEST_URL);
    schema = `ledgerly_encrypted_images_${randomUUID().replaceAll('-', '')}`;
    administrator = new DataSource({ type: 'postgres', url: databaseUrl });
    await administrator.initialize();
    await administrator.query(`CREATE SCHEMA "${schema}"`);

    dataSource = new DataSource({
      type: 'postgres',
      url: databaseUrl,
      entities: [CompanyOrmEntity, ProductOrmEntity, ProjectOrmEntity, ProjectProductOrmEntity],
      migrations: [
        InitialLedgerlySchema1730000000000,
        AddListQueryIndexes1730000001000,
        AddEncryptedStoredFileEnvelopes1730000002000,
      ],
      migrationsTransactionMode: 'each',
      extra: { max: 1, options: `-c search_path=${schema},public` },
    });
    await dataSource.initialize();
    await dataSource.runMigrations({ transaction: 'each' });

    const cipher = createStoredFileCipher({
      activeVersion: 'v1',
      keys: new Map([['v1', Buffer.alloc(32, 1)]]),
    });
    companyRepository = new TypeOrmCompanyRepository(dataSource.getRepository(CompanyOrmEntity), cipher);
    productRepository = new TypeOrmProductRepository(dataSource.getRepository(ProductOrmEntity), cipher);
    projectRepository = new TypeOrmProjectRepository(dataSource.getRepository(ProjectOrmEntity), cipher);
    projectProductRepository = new TypeOrmProjectProductRepository(dataSource.getRepository(ProjectProductOrmEntity), cipher);
    scheduleProjectReader = new TypeOrmScheduleProjectReader(dataSource, cipher);
  });

  afterAll(async () => {
    if (dataSource?.isInitialized) {
      await dataSource.destroy();
    }
    if (administrator?.isInitialized) {
      await administrator.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
      await administrator.destroy();
    }
  });

  it('encrypts every image path and clears project, company, and product envelopes without stale reads', async () => {
    const project = createProject(image);
    const product = Product.create({ id: productId, name: 'Product', price: null, stock: 0, image });
    const company = Company.create({ id: companyId, name: 'Company', logo: image });

    await projectRepository.save(project);
    await productRepository.save(product);
    await companyRepository.save(company);
    await projectProductRepository.save({ projectId, productId, leaseExpense: null, leaseExpenseDate: null });

    const encryptedProject = requireSingleRow(await dataSource.query(
      'SELECT image_ciphertext AS "ciphertext", image_nonce AS "nonce", image_tag AS "tag", image_key_version AS "keyVersion", image_mime_type AS "mimeType", image_size AS "size" FROM projects WHERE id = $1',
      [projectId],
    ));
    expect(encryptedProject).toEqual(
      expect.objectContaining({ keyVersion: 'v1', mimeType: 'image/png', size: pngBytes.length }),
    );
    expect(encryptedProject.ciphertext).not.toEqual(pngBytes);

    await expect(projectRepository.findById(projectId)).resolves.toMatchObject({ image });
    await expect(projectRepository.findByCode('PROJECT-001')).resolves.toMatchObject({ image });
    await expect(projectRepository.findAllSummaries()).resolves.toEqual([expect.objectContaining({ id: projectId, image })]);
    await expect(projectRepository.findSummaryById(projectId)).resolves.toMatchObject({ image });
    await expect(scheduleProjectReader.findActive()).resolves.toEqual([expect.objectContaining({ id: projectId, image })]);
    await expect(scheduleProjectReader.findByIds([projectId])).resolves.toEqual([expect.objectContaining({ id: projectId, image })]);
    await expect(projectProductRepository.findByProjectId(projectId)).resolves.toEqual([
      expect.objectContaining({ productId, image }),
    ]);
    await expect(new GetCompanyBrandingUseCase(companyRepository).execute()).resolves.toEqual({
      name: 'Company',
      logo: image,
      brandColor: null,
    });
    await expect(productRepository.findAll()).resolves.toEqual([expect.objectContaining({ id: productId, image })]);
    await expect(productRepository.findById(productId)).resolves.toMatchObject({ image });
    await expect(productRepository.findByName('Product')).resolves.toMatchObject({ image });

    await new UpdateProjectUseCase(projectRepository).execute({ id: projectId, image: null });

    const clearedProject = requireSingleRow(await dataSource.query(
      'SELECT image_ciphertext AS "ciphertext", image_nonce AS "nonce", image_tag AS "tag", image_key_version AS "keyVersion", image_mime_type AS "mimeType", image_size AS "size" FROM projects WHERE id = $1',
      [projectId],
    ));
    expect(clearedProject).toEqual({ ciphertext: null, nonce: null, tag: null, keyVersion: null, mimeType: null, size: null });
    await expect(projectRepository.findById(projectId)).resolves.toMatchObject({ image: null });
    await expect(projectRepository.findByCode('PROJECT-001')).resolves.toMatchObject({ image: null });
    await expect(projectRepository.findAllSummaries()).resolves.toEqual([expect.objectContaining({ id: projectId, image: null })]);
    await expect(projectRepository.findSummaryById(projectId)).resolves.toMatchObject({ image: null });
    await expect(scheduleProjectReader.findActive()).resolves.toEqual([expect.objectContaining({ id: projectId, image: null })]);
    await expect(scheduleProjectReader.findByIds([projectId])).resolves.toEqual([expect.objectContaining({ id: projectId, image: null })]);

    company.changeLogo(null);
    await companyRepository.save(company);
    const clearedCompany = requireSingleRow(await dataSource.query(
      'SELECT logo_ciphertext AS "ciphertext", logo_nonce AS "nonce", logo_tag AS "tag", logo_key_version AS "keyVersion", logo_mime_type AS "mimeType", logo_size AS "size" FROM companies WHERE id = $1',
      [companyId],
    ));
    expect(clearedCompany).toEqual({ ciphertext: null, nonce: null, tag: null, keyVersion: null, mimeType: null, size: null });
    await expect(companyRepository.find()).resolves.toMatchObject({ logo: null });
    await expect(new GetCompanyBrandingUseCase(companyRepository).execute()).resolves.toEqual({
      name: 'Company',
      logo: null,
      brandColor: null,
    });

    product.changeDetails({
      reference: product.reference,
      category: product.category,
      brand: product.brand,
      description: product.description,
      image: null,
      tags: product.tags,
    });
    await productRepository.save(product);
    const clearedProduct = requireSingleRow(await dataSource.query(
      'SELECT image_ciphertext AS "ciphertext", image_nonce AS "nonce", image_tag AS "tag", image_key_version AS "keyVersion", image_mime_type AS "mimeType", image_size AS "size" FROM products WHERE id = $1',
      [productId],
    ));
    expect(clearedProduct).toEqual({ ciphertext: null, nonce: null, tag: null, keyVersion: null, mimeType: null, size: null });
    await expect(productRepository.findAll()).resolves.toEqual([expect.objectContaining({ id: productId, image: null })]);
    await expect(productRepository.findById(productId)).resolves.toMatchObject({ image: null });
    await expect(productRepository.findByName('Product')).resolves.toMatchObject({ image: null });
    await expect(projectProductRepository.findByProjectId(projectId)).resolves.toEqual([
      expect.objectContaining({ productId, image: null }),
    ]);
  });
});

function createProject(projectImage: string | null): Project {
  return Project.create({
    id: projectId,
    name: 'Project',
    code: 'PROJECT-001',
    type: 'client',
    status: 'active',
    description: null,
    clientCompany: null,
    clientTaxId: null,
    contactName: null,
    contactEmail: null,
    contactPhone: null,
    address: null,
    startDate: null,
    endDate: null,
    budget: null,
    currency: 'EUR',
    fiscalYear: null,
    manager: null,
    image: projectImage,
    color: null,
  });
}

function parseMigrationTestDatabaseUrl(value: unknown): string {
  if (typeof value !== 'string') {
    throw new Error('Invalid migration test database URL');
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error('Invalid migration test database URL');
  }

  if (
    (url.protocol !== 'postgres:' && url.protocol !== 'postgresql:') ||
    (url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') ||
    url.port.length === 0 ||
    url.pathname !== '/ledgerly_migration_test' ||
    url.search.length > 0 ||
    url.hash.length > 0
  ) {
    throw new Error('Invalid migration test database URL');
  }

  return value;
}

function requireSingleRow(value: unknown): Record<string, unknown> {
  if (
    !Array.isArray(value) ||
    value.length !== 1 ||
    typeof value[0] !== 'object' ||
    value[0] === null ||
    Array.isArray(value[0])
  ) {
    throw new Error('Expected one query row');
  }

  return value[0] as Record<string, unknown>;
}
