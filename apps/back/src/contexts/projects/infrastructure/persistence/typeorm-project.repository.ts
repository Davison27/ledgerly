import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Project } from '../../domain/project';
import { ProjectSummary } from '../../domain/project-summary';
import { ProjectDashboardRow, ProjectRepository } from '../../domain/project.repository';
import { ProjectOrmEntity } from './project.orm-entity';
import { ProjectMapper } from './project.mapper';
import { getListLimit, ListLimitExceededException } from '../../../../shared/infrastructure/list-limit';
import { STORED_FILE_CIPHER, StoredFileCipher } from '../../../../shared/domain/stored-file-cipher.port';
import { decryptStoredImage, encryptStoredImage } from '../../../../shared/infrastructure/crypto/stored-image-envelope';

type ProjectSummaryRow = Omit<ProjectSummary, 'financials' | 'image'> & {
  imageCiphertext: Buffer | null;
  imageKeyVersion: string | null;
  imageMimeType: string | null;
  imageNonce: Buffer | null;
  imageSize: number | null;
  imageTag: Buffer | null;
};

@Injectable()
export class TypeOrmProjectRepository implements ProjectRepository {
  private readonly mapper = new ProjectMapper();

  constructor(
    @InjectRepository(ProjectOrmEntity)
    private readonly repository: Repository<ProjectOrmEntity>,
    @Inject(STORED_FILE_CIPHER) private readonly storedFileCipher: StoredFileCipher,
  ) {}

  async findAllSummaries(): Promise<ProjectSummary[]> {
    const limit = getListLimit('MAX_LIST_ITEMS', 500);
    const rows: ProjectSummaryRow[] = await this.repository.manager.query(`
      SELECT p.id, p.name, p.code, p.currency, p.image_ciphertext AS "imageCiphertext",
        p.image_nonce AS "imageNonce", p.image_tag AS "imageTag", p.image_key_version AS "imageKeyVersion",
        p.image_mime_type AS "imageMimeType", p.image_size AS "imageSize", p.color, p.is_demo AS "isDemo",
        COUNT(d.id)::int AS "documentCount",
        COUNT(d.id) FILTER (WHERE d.status = 'pendiente')::int AS "pendingCount"
      FROM projects p
      LEFT JOIN documents d ON d.project_id = p.id
      GROUP BY p.id, p.name, p.code, p.currency, p.image_ciphertext, p.image_nonce, p.image_tag,
        p.image_key_version, p.image_mime_type, p.image_size, p.color, p.is_demo
      ORDER BY p.name ASC
      LIMIT $1
    `, [limit + 1]);

    if (rows.length > limit) throw new ListLimitExceededException(limit, 'Projects');

    return rows.map((row) => this.toSummary(row));
  }

  async findNamesByIds(ids: string[]): Promise<Array<{ id: string; name: string }>> {
    if (ids.length === 0) {
      return [];
    }

    return this.repository.find({
      select: { id: true, name: true },
      where: { id: In(ids) },
    });
  }

  async findSummaryById(id: string): Promise<ProjectSummary | null> {
    const rows: ProjectSummaryRow[] = await this.repository.manager.query(
      `
      SELECT p.id, p.name, p.code, p.currency, p.image_ciphertext AS "imageCiphertext",
        p.image_nonce AS "imageNonce", p.image_tag AS "imageTag", p.image_key_version AS "imageKeyVersion",
        p.image_mime_type AS "imageMimeType", p.image_size AS "imageSize", p.color, p.is_demo AS "isDemo",
        COUNT(d.id)::int AS "documentCount",
        COUNT(d.id) FILTER (WHERE d.status = 'pendiente')::int AS "pendingCount"
      FROM projects p
      LEFT JOIN documents d ON d.project_id = p.id
      WHERE p.id = $1
      GROUP BY p.id, p.name, p.code, p.currency, p.image_ciphertext, p.image_nonce, p.image_tag,
        p.image_key_version, p.image_mime_type, p.image_size, p.color, p.is_demo
      ORDER BY p.name ASC
    `,
      [id],
    );

    return rows.length > 0 ? this.toSummary(rows[0]) : null;
  }

  async findById(id: string): Promise<Project | null> {
    const orm = await this.findOneWithImage({ id });

    return orm !== null ? this.mapper.toDomain(orm, this.decryptImage(orm)) : null;
  }

  async findByCode(code: string): Promise<Project | null> {
    const orm = await this.findOneWithImage({ code });

    return orm !== null ? this.mapper.toDomain(orm, this.decryptImage(orm)) : null;
  }

  async save(project: Project): Promise<void> {
    const primitives = project.toPrimitives();
    const encryptedImage = encryptStoredImage(primitives.image, 'projectImage', primitives.id, this.storedFileCipher);
    const orm = this.mapper.toOrm(project);
    orm.imageCiphertext = encryptedImage.envelope.ciphertext ?? null;
    orm.imageNonce = encryptedImage.envelope.nonce ?? null;
    orm.imageTag = encryptedImage.envelope.tag ?? null;
    orm.imageKeyVersion = encryptedImage.envelope.keyVersion ?? null;
    orm.imageMimeType = encryptedImage.envelope.mimeType ?? null;
    orm.imageSize = encryptedImage.envelope.size ?? null;
    await this.repository.save(orm);
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  async findAllForDashboard(): Promise<ProjectDashboardRow[]> {
    const orms = await this.repository.find({
      select: {
        id: true,
        name: true,
        budget: true,
        currency: true,
      },
    });

    return orms.map((orm) => ({
      id: orm.id,
      name: orm.name,
      budget: orm.budget !== null ? Number(orm.budget) : null,
      currency: orm.currency,
    }));
  }

  private async findOneWithImage(where: { id: string } | { code: string }): Promise<ProjectOrmEntity | null> {
    return this.repository
      .createQueryBuilder('project')
      .addSelect([
        'project.imageCiphertext',
        'project.imageNonce',
        'project.imageTag',
        'project.imageKeyVersion',
        'project.imageMimeType',
        'project.imageSize',
      ])
      .where(where)
      .getOne();
  }

  private toSummary(row: ProjectSummaryRow): ProjectSummary {
    const { imageCiphertext, imageKeyVersion, imageMimeType, imageNonce, imageSize, imageTag, ...summary } = row;
    return {
      ...summary,
      financials: [],
      image: decryptStoredImage(
        {
          ciphertext: imageCiphertext,
          keyVersion: imageKeyVersion,
          mimeType: imageMimeType,
          nonce: imageNonce,
          size: imageSize,
          tag: imageTag,
        },
        'projectImage',
        row.id,
        this.storedFileCipher,
      ),
    };
  }

  private decryptImage(orm: ProjectOrmEntity): string | null {
    return decryptStoredImage(
      {
        ciphertext: orm.imageCiphertext,
        keyVersion: orm.imageKeyVersion,
        mimeType: orm.imageMimeType,
        nonce: orm.imageNonce,
        size: orm.imageSize,
        tag: orm.imageTag,
      },
      'projectImage',
      orm.id,
      this.storedFileCipher,
    );
  }
}
