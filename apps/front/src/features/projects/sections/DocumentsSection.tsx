import { Empty } from 'antd';
import type { ProjectSectionProps } from './types';

// Sección de Documentos. Contenido implementado por su agente.
export function DocumentsSection({ project }: ProjectSectionProps) {
  void project;
  return (
    <div style={{ padding: 24 }}>
      <Empty description="Documentos" />
    </div>
  );
}
