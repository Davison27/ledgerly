import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import { InvalidValueException } from '../../../../shared/domain/invalid-value.exception';
import { EntityNotFoundException } from '../../../../shared/domain/entity-not-found.exception';
import { STORED_FILE_CIPHER, StoredFileCipher } from '../../../../shared/domain/stored-file-cipher.port';
import { encryptStoredImage } from '../../../../shared/infrastructure/crypto/stored-image-envelope';
import { ClientArchivedException } from '../../domain/errors/client-archived.exception';
import { ClientNotFoundException } from '../../domain/errors/client-not-found.exception';
import { Project } from '../../domain/project';
import { ProjectChecklistTemplate } from '../../domain/project-checklist-template';
import {
  ProjectClientLifecycleCoordinator,
} from '../../domain/project-client-lifecycle-coordinator.port';
import { ProjectMapper } from './project.mapper';
import { ProjectOrmEntity } from './project.orm-entity';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Injectable()
export class TypeOrmProjectClientLifecycleCoordinator implements ProjectClientLifecycleCoordinator {
  private readonly mapper = new ProjectMapper();

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @Inject(STORED_FILE_CIPHER) private readonly storedFileCipher: StoredFileCipher,
  ) {}

  async saveProjectForActiveClient(project: Project, checklistTemplateId?: string): Promise<void> {
    const clientId = project.clientId;
    if (!UUID_PATTERN.test(clientId)) {
      throw new InvalidValueException('clientId must be a valid UUID');
    }
    if (checklistTemplateId !== undefined && !UUID_PATTERN.test(checklistTemplateId)) {
      throw new InvalidValueException('checklistTemplateId must be a valid UUID');
    }
    if (checklistTemplateId !== undefined && !project.planningEnabled) {
      throw new InvalidValueException('A checklist template can only be assigned when planning is enabled');
    }

    await this.dataSource.transaction(async (manager) => {
      await this.lockActiveClient(manager, clientId);
      await this.saveProject(manager, project);
      if (checklistTemplateId !== undefined) {
        await this.createChecklistSnapshot(manager, project.id, checklistTemplateId);
      } else if (project.planningEnabled) {
        await this.assertChecklistExists(manager, project.id);
      }
    });
  }

  async deleteOrArchiveClient(clientId: string): Promise<'deleted' | 'archived'> {
    if (!UUID_PATTERN.test(clientId)) {
      throw new InvalidValueException('clientId must be a valid UUID');
    }

    return this.dataSource.transaction(async (manager) => {
      const client = await this.lockClient(manager, clientId);
      const rows: Array<{ count: number | string }> = await manager.query(
        'SELECT count(*)::int AS count FROM projects WHERE client_id = $1',
        [client.id],
      );
      const hasProjects = Number(rows[0]?.count ?? 0) > 0;

      if (hasProjects) {
        await manager.query('UPDATE clients SET archived_at = CURRENT_TIMESTAMP WHERE id = $1', [client.id]);
        return 'archived';
      }

      await manager.query('DELETE FROM clients WHERE id = $1', [client.id]);
      return 'deleted';
    });
  }

  private async lockActiveClient(manager: EntityManager, clientId: string): Promise<void> {
    const client = await this.lockClient(manager, clientId);
    if (client.archivedAt !== null) {
      throw new ClientArchivedException(clientId);
    }
  }

  private async lockClient(manager: EntityManager, clientId: string): Promise<{ id: string; archivedAt: Date | null }> {
    const rows: Array<{ id: string; archivedAt: Date | null }> = await manager.query(
      'SELECT id, archived_at AS "archivedAt" FROM clients WHERE id = $1 FOR UPDATE',
      [clientId],
    );
    const client = rows[0];
    if (!client) {
      throw new ClientNotFoundException(clientId);
    }

    return client;
  }

  private async saveProject(manager: EntityManager, project: Project): Promise<void> {
    const primitives = project.toPrimitives();
    const encryptedImage = encryptStoredImage(
      primitives.image,
      'projectImage',
      primitives.id,
      this.storedFileCipher,
    );
    const orm = this.mapper.toOrm(project);
    orm.imageCiphertext = encryptedImage.envelope.ciphertext ?? null;
    orm.imageNonce = encryptedImage.envelope.nonce ?? null;
    orm.imageTag = encryptedImage.envelope.tag ?? null;
    orm.imageKeyVersion = encryptedImage.envelope.keyVersion ?? null;
    orm.imageMimeType = encryptedImage.envelope.mimeType ?? null;
    orm.imageSize = encryptedImage.envelope.size ?? null;
    await manager.getRepository(ProjectOrmEntity).save(orm);
  }

  private async createChecklistSnapshot(
    manager: EntityManager,
    projectId: string,
    templateId: string,
  ): Promise<void> {
    const existing: Array<{ projectId: string }> = await manager.query(
      'SELECT project_id AS "projectId" FROM project_checklists WHERE project_id = $1 FOR UPDATE',
      [projectId],
    );
    if (existing.length > 0) {
      throw new InvalidValueException('A project checklist template cannot be replaced');
    }

    const templates: Array<{ id: string; name: string }> = await manager.query(
      'SELECT id, name FROM project_checklist_templates WHERE id = $1 FOR SHARE',
      [templateId],
    );
    const template = templates[0];
    if (template === undefined) {
      throw new EntityNotFoundException('Checklist template', templateId);
    }

    const items: Array<{ id: string; text: string; position: number }> = await manager.query(
      'SELECT id, text, position FROM project_checklist_template_items WHERE template_id = $1 ORDER BY position ASC FOR SHARE',
      [templateId],
    );
    const checklistTemplate = ProjectChecklistTemplate.rehydrate({
      ...template,
      items,
    });
    await manager.query(
      'INSERT INTO project_checklists (project_id, source_template_id, name) VALUES ($1, $2, $3)',
      [projectId, templateId, checklistTemplate.name],
    );
    for (const item of checklistTemplate.items) {
      await manager.query(
        'INSERT INTO project_checklist_items (id, project_id, text, position, completed) VALUES ($1, $2, $3, $4, false)',
        [randomUUID(), projectId, item.text, item.position],
      );
    }
  }

  private async assertChecklistExists(manager: EntityManager, projectId: string): Promise<void> {
    const rows: Array<{ projectId: string }> = await manager.query(
      'SELECT project_id AS "projectId" FROM project_checklists WHERE project_id = $1 FOR UPDATE',
      [projectId],
    );
    if (rows.length === 0) {
      throw new InvalidValueException('An assigned checklist template is required when planning is enabled');
    }
  }
}
