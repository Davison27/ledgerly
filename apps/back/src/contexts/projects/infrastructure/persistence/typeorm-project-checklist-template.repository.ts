import { InjectDataSource } from '@nestjs/typeorm';
import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { ProjectChecklistTemplate } from '../../domain/project-checklist-template';
import { ProjectChecklistTemplateRepository } from '../../domain/project-checklist-template.repository';

interface TemplateRow {
  id: string;
  name: string;
}

interface TemplateItemRow {
  id: string;
  templateId: string;
  text: string;
  position: number;
}

@Injectable()
export class TypeOrmProjectChecklistTemplateRepository implements ProjectChecklistTemplateRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async findAll(): Promise<ProjectChecklistTemplate[]> {
    const templates: TemplateRow[] = await this.dataSource.query(
      'SELECT id, name FROM project_checklist_templates ORDER BY name ASC',
    );
    return this.mapTemplates(templates, this.dataSource.manager);
  }

  async findById(id: string): Promise<ProjectChecklistTemplate | null> {
    const templates: TemplateRow[] = await this.dataSource.query(
      'SELECT id, name FROM project_checklist_templates WHERE id = $1',
      [id],
    );
    if (templates.length === 0) return null;
    return (await this.mapTemplates(templates, this.dataSource.manager))[0];
  }

  async create(template: ProjectChecklistTemplate): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      await manager.query(
        'INSERT INTO project_checklist_templates (id, name) VALUES ($1, $2)',
        [template.id, template.name],
      );
      await this.insertItems(manager, template);
    });
  }

  async update(template: ProjectChecklistTemplate): Promise<boolean> {
    return this.dataSource.transaction(async (manager) => {
      const rows: Array<{ id: string }> = await manager.query(
        'SELECT id FROM project_checklist_templates WHERE id = $1 FOR UPDATE',
        [template.id],
      );
      if (rows.length === 0) return false;

      await manager.query('UPDATE project_checklist_templates SET name = $1 WHERE id = $2', [
        template.name,
        template.id,
      ]);
      await manager.query('DELETE FROM project_checklist_template_items WHERE template_id = $1', [template.id]);
      await this.insertItems(manager, template);
      return true;
    });
  }

  async delete(id: string): Promise<boolean> {
    const rows: Array<{ id: string }> = await this.dataSource.query(
      'DELETE FROM project_checklist_templates WHERE id = $1 RETURNING id',
      [id],
    );
    return rows.length > 0;
  }

  private async mapTemplates(
    templates: TemplateRow[],
    manager: EntityManager,
  ): Promise<ProjectChecklistTemplate[]> {
    if (templates.length === 0) return [];

    const templateIds = templates.map((template) => template.id);
    const items: TemplateItemRow[] = await manager.query(
      'SELECT id, template_id AS "templateId", text, position FROM project_checklist_template_items WHERE template_id = ANY($1::uuid[]) ORDER BY template_id, position ASC',
      [templateIds],
    );
    const itemsByTemplate = new Map<string, TemplateItemRow[]>();
    for (const item of items) {
      const templateItems = itemsByTemplate.get(item.templateId) ?? [];
      templateItems.push(item);
      itemsByTemplate.set(item.templateId, templateItems);
    }

    return templates.map((template) => ProjectChecklistTemplate.rehydrate({
      ...template,
      items: (itemsByTemplate.get(template.id) ?? []).map(({ id, text, position }) => ({ id, text, position })),
    }));
  }

  private async insertItems(manager: EntityManager, template: ProjectChecklistTemplate): Promise<void> {
    for (const item of template.items) {
      await manager.query(
        'INSERT INTO project_checklist_template_items (id, template_id, text, position) VALUES ($1, $2, $3, $4)',
        [item.id, template.id, item.text, item.position],
      );
    }
  }
}
