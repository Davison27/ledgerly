import type { ProjectChecklistDto, ProjectChecklistTemplateDto } from '../api/types';

export function mapProjectChecklistTemplate(
  template: ProjectChecklistTemplateDto,
): ProjectChecklistTemplateDto {
  return { ...template, items: [...template.items].sort((a, b) => a.position - b.position) };
}

export function mapProjectChecklist(checklist: ProjectChecklistDto): ProjectChecklistDto {
  return { ...checklist, items: [...checklist.items].sort((a, b) => a.position - b.position) };
}
