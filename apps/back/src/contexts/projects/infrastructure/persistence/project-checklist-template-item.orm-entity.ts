import { Check, Column, Entity, ForeignKey, PrimaryColumn, Unique } from 'typeorm';
import { ProjectChecklistTemplateOrmEntity } from './project-checklist-template.orm-entity';

@Entity('project_checklist_template_items')
@Unique('UQ_project_checklist_template_items_position', ['templateId', 'position'])
@Check('CHK_project_checklist_template_items_text', 'char_length(btrim("text")) > 0')
@Check('CHK_project_checklist_template_items_position', '"position" >= 0')
export class ProjectChecklistTemplateItemOrmEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ name: 'template_id', type: 'uuid' })
  @ForeignKey(() => ProjectChecklistTemplateOrmEntity, {
    name: 'FK_project_checklist_template_items_template',
    onDelete: 'CASCADE',
  })
  templateId: string;

  @Column({ type: 'varchar', length: 500 })
  text: string;

  @Column({ type: 'integer' })
  position: number;
}
