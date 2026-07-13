import type { ProjectSectionProps } from './types';
import { DetailsCard } from './settings/DetailsCard';
import { TeamCard } from './settings/TeamCard';

// Sección de Configuración: detalles, equipo, notificaciones e integraciones.
export function SettingsSection({ project }: ProjectSectionProps) {
  return (
    <div
      style={{
        padding: 28,
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
        gap: 20,
        alignItems: 'start',
      }}
    >
      <DetailsCard project={project} />
      <TeamCard />
    </div>
  );
}
