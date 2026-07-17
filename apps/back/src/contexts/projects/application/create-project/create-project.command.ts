import { ProjectType } from '../../domain/project-type';
import { ProjectStatus } from '../../domain/project-status';
import { ProjectCurrency } from '../../domain/project-currency';

export interface CreateProjectCommand {
  name: string;
  code: string;
  type: ProjectType;
  status?: ProjectStatus;
  description?: string | null;
  clientCompany?: string | null;
  clientTaxId?: string | null;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  address?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  budget?: number | null;
  currency?: ProjectCurrency;
  fiscalYear?: string | null;
  manager?: string | null;
  image?: string | null;
}
