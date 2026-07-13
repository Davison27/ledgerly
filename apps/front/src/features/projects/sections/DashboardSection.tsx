import { Empty } from 'antd';
import type { ProjectSectionProps } from './types';

// Sección de Panel (dashboard). Contenido implementado por su agente.
export function DashboardSection({ project }: ProjectSectionProps) {
  void project;
  return (
    <div style={{ padding: 24 }}>
      <Empty description="Panel" />
    </div>
  );
}
