import { USE_MOCKS } from '../config';
import { mockCompany, mockProjects, type Company } from './mocks/company.mock';

export type {
  Company,
  Project,
  ProjectType,
  ProjectStatus,
  ProjectCurrency,
  ProjectFormValues,
} from './mocks/company.mock';

export const company: Company = mockCompany;

export const initialProjects = USE_MOCKS ? mockProjects : [];
