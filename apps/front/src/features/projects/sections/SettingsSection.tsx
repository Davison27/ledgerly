import { Empty } from 'antd';
import type { ProjectSectionProps } from './types';

// Sección de Configuración. Contenido implementado por su agente.
export function SettingsSection({ project }: ProjectSectionProps) {
  void project;
  return (
    <div style={{ padding: 24 }}>
      <Empty description="Configuración" />
    </div>
  );
}
