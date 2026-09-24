import { InjectDataSource } from '@nestjs/typeorm';
import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { ProjectChecklist } from '../../domain/project-checklist';
import { ProjectChecklistRepository } from '../../domain/project-checklist.repository';

interface ChecklistRow {
  projectId: string;
  sourceTemplateId: string | null;
  name: string;
  itemId: string | null;
  text: string | null;
  position: number | null;
  completed: boolean | null;
}

interface ItemRow {
  id: string;
  text: string;
  position: number;
  completed: boolean;
}

@Injectable()
export class TypeOrmProjectChecklistRepository implements ProjectChecklistRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async findByProjectId(projectId: string): Promise<ProjectChecklist | null> {
    const rows: ChecklistRow[] = await this.dataSource.query(
      `SELECT pc.project_id AS "projectId", pc.source_template_id AS "sourceTemplateId", pc.name,
        pci.id AS "itemId", pci.text, pci.position, pci.completed
      FROM project_checklists pc
      JOIN projects p ON p.id = pc.project_id AND p.planning_enabled = TRUE
      LEFT JOIN project_checklist_items pci ON pci.project_id = pc.project_id
      WHERE pc.project_id = $1
      ORDER BY pci.position ASC`,
      [projectId],
    );
    if (rows.length === 0) return null;
    const checklist = rows[0];
    return ProjectChecklist.rehydrate({
      projectId: checklist.projectId,
      sourceTemplateId: checklist.sourceTemplateId,
      name: checklist.name,
      items: rows.flatMap((row) => this.toItem(row)),
    });
  }

  async addItem(projectId: string, item: { id: string; text: string; position: number; completed: boolean }): Promise<boolean> {
    return this.dataSource.transaction(async (manager) => {
      if (!(await this.lockEnabledChecklist(manager, projectId))) return false;
      const rows: Array<{ position: number }> = await manager.query(
        'SELECT COALESCE(MAX(position) + 1, 0)::int AS position FROM project_checklist_items WHERE project_id = $1',
        [projectId],
      );
      await manager.query(
        'INSERT INTO project_checklist_items (id, project_id, text, position, completed) VALUES ($1, $2, $3, $4, false)',
        [item.id, projectId, item.text, rows[0].position],
      );
      return true;
    });
  }

  async updateItem(
    projectId: string,
    itemId: string,
    changes: Partial<{ text: string; completed: boolean; position: number }>,
  ): Promise<boolean> {
    return this.dataSource.transaction(async (manager) => {
      if (!(await this.lockEnabledChecklist(manager, projectId))) return false;
      const rows: ItemRow[] = await manager.query(
        'SELECT id, text, position, completed FROM project_checklist_items WHERE project_id = $1 ORDER BY position ASC FOR UPDATE',
        [projectId],
      );
      const current = rows.find((row) => row.id === itemId);
      if (current === undefined) return false;

      const text = changes.text ?? current.text;
      const completed = changes.completed ?? current.completed;
      const ordered = [...rows];
      if (changes.position !== undefined && changes.position !== current.position) {
        if (!Number.isInteger(changes.position) || changes.position < 0 || changes.position >= rows.length) {
          return false;
        }
        ordered.splice(current.position, 1);
        ordered.splice(changes.position, 0, current);
        const offsets: Array<{ maxPosition: number }> = await manager.query(
          'SELECT COALESCE(MAX(position), -1)::int AS "maxPosition" FROM project_checklist_items WHERE project_id = $1',
          [projectId],
        );
        const offset = offsets[0].maxPosition + 1;
        await manager.query('UPDATE project_checklist_items SET position = position + $1 WHERE project_id = $2', [
          offset,
          projectId,
        ]);
        for (const [position, row] of ordered.entries()) {
          await manager.query('UPDATE project_checklist_items SET position = $1 WHERE id = $2', [position, row.id]);
        }
      }

      await manager.query(
        'UPDATE project_checklist_items SET text = $1, completed = $2 WHERE project_id = $3 AND id = $4',
        [text, completed, projectId, itemId],
      );
      return true;
    });
  }

  async deleteItem(projectId: string, itemId: string): Promise<boolean> {
    return this.dataSource.transaction(async (manager) => {
      if (!(await this.lockEnabledChecklist(manager, projectId))) return false;
      const deleted: Array<{ id: string }> = await manager.query(
        'DELETE FROM project_checklist_items WHERE project_id = $1 AND id = $2 RETURNING id',
        [projectId, itemId],
      );
      if (deleted.length === 0) return false;

      const rows: ItemRow[] = await manager.query(
        'SELECT id FROM project_checklist_items WHERE project_id = $1 ORDER BY position ASC FOR UPDATE',
        [projectId],
      );
      const offsets: Array<{ maxPosition: number }> = await manager.query(
        'SELECT COALESCE(MAX(position), -1)::int AS "maxPosition" FROM project_checklist_items WHERE project_id = $1',
        [projectId],
      );
      const offset = offsets[0].maxPosition + 1;
      await manager.query('UPDATE project_checklist_items SET position = position + $1 WHERE project_id = $2', [
        offset,
        projectId,
      ]);
      for (const [position, row] of rows.entries()) {
        await manager.query('UPDATE project_checklist_items SET position = $1 WHERE id = $2', [position, row.id]);
      }
      return true;
    });
  }

  private async lockEnabledChecklist(manager: EntityManager, projectId: string): Promise<boolean> {
    const rows: Array<{ projectId: string }> = await manager.query(
      `SELECT pc.project_id AS "projectId" FROM project_checklists pc
      JOIN projects p ON p.id = pc.project_id AND p.planning_enabled = TRUE
      WHERE pc.project_id = $1 FOR UPDATE OF pc, p`,
      [projectId],
    );
    return rows.length > 0;
  }

  private toItem(row: ChecklistRow): ProjectChecklist['items'] {
    if (row.itemId === null || row.text === null || row.position === null || row.completed === null) return [];
    return [{ id: row.itemId, text: row.text, position: row.position, completed: row.completed }];
  }
}
