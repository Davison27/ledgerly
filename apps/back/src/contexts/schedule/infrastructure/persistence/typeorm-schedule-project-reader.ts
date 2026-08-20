import { Inject, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import {
  ScheduleProjectReader,
  ScheduleProjectView,
  SchedulableProjectView,
} from '../../domain/schedule-project-reader.port';
import { getListLimit, ListLimitExceededException } from '../../../../shared/infrastructure/list-limit';
import { STORED_FILE_CIPHER, StoredFileCipher } from '../../../../shared/domain/stored-file-cipher.port';
import { decryptStoredImage } from '../../../../shared/infrastructure/crypto/stored-image-envelope';

type ScheduleProjectRow = Omit<ScheduleProjectView, 'image'> & {
  hasEvents?: boolean;
  imageCiphertext: Buffer | null;
  imageKeyVersion: string | null;
  imageMimeType: string | null;
  imageNonce: Buffer | null;
  imageSize: number | null;
  imageTag: Buffer | null;
};

@Injectable()
export class TypeOrmScheduleProjectReader implements ScheduleProjectReader {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @Inject(STORED_FILE_CIPHER) private readonly storedFileCipher: StoredFileCipher,
  ) {}

  async findActive(): Promise<SchedulableProjectView[]> {
    const limit = getListLimit('MAX_LIST_ITEMS', 500);
    const rows: ScheduleProjectRow[] = await this.dataSource.query(
      `SELECT p.id, p.name, p.code, p.image_ciphertext AS "imageCiphertext", p.image_nonce AS "imageNonce",
              p.image_tag AS "imageTag", p.image_key_version AS "imageKeyVersion",
              p.image_mime_type AS "imageMimeType", p.image_size AS "imageSize", p.status, p.color,
              p.start_date::text AS "startDate", p.end_date::text AS "endDate",
              EXISTS (SELECT 1 FROM schedule_events se WHERE se.project_id = p.id) AS "hasEvents"
       FROM projects p WHERE p.status = 'active' ORDER BY p.name ASC LIMIT $1`,
      [limit + 1],
    );

    if (rows.length > limit) {
      throw new ListLimitExceededException(limit, 'Schedulable projects');
    }

    return rows.map((row) => this.toProject(row)) as SchedulableProjectView[];
  }

  async findByIds(ids: string[]): Promise<ScheduleProjectView[]> {
    if (ids.length === 0) {
      return [];
    }

    const rows: ScheduleProjectRow[] = await this.dataSource.query(
      `SELECT id, name, code, image_ciphertext AS "imageCiphertext", image_nonce AS "imageNonce",
              image_tag AS "imageTag", image_key_version AS "imageKeyVersion",
              image_mime_type AS "imageMimeType", image_size AS "imageSize", status, color,
              start_date::text AS "startDate", end_date::text AS "endDate"
       FROM projects WHERE id = ANY($1)`,
      [ids],
    );

    return rows.map((row) => this.toProject(row));
  }

  private toProject(row: ScheduleProjectRow): ScheduleProjectView | SchedulableProjectView {
    const { imageCiphertext, imageKeyVersion, imageMimeType, imageNonce, imageSize, imageTag, ...project } = row;
    return {
      ...project,
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
}
