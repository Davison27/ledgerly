export interface ProjectChecklistTemplateItemDto {
  id: string;
  text: string;
  position: number;
}

export interface ProjectChecklistTemplateDto {
  id: string;
  name: string;
  items: ProjectChecklistTemplateItemDto[];
}

export interface ProjectChecklistItemDto extends ProjectChecklistTemplateItemDto {
  completed: boolean;
}

export interface ProjectChecklistDto {
  projectId: string;
  name: string;
  items: ProjectChecklistItemDto[];
}

export interface CreateProjectChecklistTemplatePayload {
  name: string;
  items?: string[];
}

export interface UpdateProjectChecklistTemplatePayload {
  name: string;
  items: string[];
}

export interface UpdateProjectChecklistItemPayload {
  text?: string;
  completed?: boolean;
  position?: number;
}
