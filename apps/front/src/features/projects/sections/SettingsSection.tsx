import type { ProjectSectionProps } from './types';
import { DetailsCard } from './settings/DetailsCard';
import { TeamCard } from './settings/TeamCard';
import { NotificationsCard } from './settings/NotificationsCard';
import { IntegrationsCard } from './settings/IntegrationsCard';

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
      <NotificationsCard />
      <IntegrationsCard />
    </div>
  );
}
