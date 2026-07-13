import type { Project } from '../../../data/enterprises';

/** Props comunes a todas las secciones del detalle de proyecto. */
export interface ProjectSectionProps {
  project: Project;
  /** Color de la empresa (para acentos del avatar/gráficas). */
  color: string;
}
