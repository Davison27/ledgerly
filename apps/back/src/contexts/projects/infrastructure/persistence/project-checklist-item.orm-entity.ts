import { Check, Column, Entity, ForeignKey, PrimaryColumn, Unique } from 'typeorm';
import { ProjectChecklistOrmEntity } from './project-checklist.orm-entity';

@Entity('project_checklist_items')
@Unique('UQ_project_checklist_items_position', ['projectId', 'position'])
@Check('CHK_project_checklist_items_text', 'char_length(btrim("text")) > 0')
@Check('CHK_project_checklist_items_position', '"position" >= 0')
export class ProjectChecklistItemOrmEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ name: 'project_id', type: 'uuid' })
  @ForeignKey(() => ProjectChecklistOrmEntity, {
    name: 'FK_project_checklist_items_checklist',
    onDelete: 'CASCADE',
  })
  projectId: string;

  @Column({ type: 'varchar', length: 500 })
  text: string;

  @Column({ type: 'integer' })
  position: number;

  @Column({ type: 'boolean', default: false })
  completed: boolean;
}
