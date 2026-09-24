import { Check, Column, Entity, ForeignKey, Index, PrimaryColumn } from 'typeorm';
import { ProjectOrmEntity } from './project.orm-entity';
import { ProjectChecklistTemplateOrmEntity } from './project-checklist-template.orm-entity';

@Entity('project_checklists')
@Index('IDX_project_checklists_source_template_id', ['sourceTemplateId'])
@Check('CHK_project_checklists_name', 'char_length(btrim("name")) > 0')
export class ProjectChecklistOrmEntity {
  @PrimaryColumn({ name: 'project_id', type: 'uuid' })
  @ForeignKey(() => ProjectOrmEntity, {
    name: 'FK_project_checklists_project',
    onDelete: 'CASCADE',
  })
  projectId: string;

  @Column({ name: 'source_template_id', type: 'uuid', nullable: true })
  @ForeignKey(() => ProjectChecklistTemplateOrmEntity, {
    name: 'FK_project_checklists_source_template',
    onDelete: 'SET NULL',
  })
  sourceTemplateId: string | null;

  @Column({ length: 160 })
  name: string;
}
