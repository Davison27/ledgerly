import type { ClientSummaryDto } from '@/entities/client';
import { useNavigate } from '@tanstack/react-router';
import { CompaniesPage as CompaniesPageView } from '../ui/page/CompaniesPage';
import { useCompaniesPage } from './useCompaniesPage';

export interface CompaniesPageContainerProps {
  onOpenClient?: (client: ClientSummaryDto) => void;
}

export function CompaniesPageContainer({ onOpenClient }: CompaniesPageContainerProps) {
  const navigate = useNavigate();
  const handleOpenClient = onOpenClient ?? ((client: ClientSummaryDto) => {
    void navigate({
      to: '/companies/$clientId/projects',
      params: { clientId: client.id },
    });
  });

  return <CompaniesPageView model={useCompaniesPage({ onOpenClient: handleOpenClient })} />;
}
