import type { ClientSummaryDto } from '@/entities/client';
import { CompaniesPage as CompaniesPageView } from '../ui/page/CompaniesPage';
import { useCompaniesPage } from './useCompaniesPage';

export interface CompaniesPageContainerProps {
  onOpenClient?: (client: ClientSummaryDto) => void;
}

export function CompaniesPageContainer({ onOpenClient }: CompaniesPageContainerProps) {
  return <CompaniesPageView model={useCompaniesPage({ onOpenClient })} />;
}
