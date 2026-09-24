import { Check, Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('project_checklist_templates')
@Check('CHK_project_checklist_templates_name', 'char_length(btrim("name")) > 0')
export class ProjectChecklistTemplateOrmEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ length: 160 })
  name: string;
}
