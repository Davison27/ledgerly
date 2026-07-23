export interface ProjectSummary {
  id: string;
  name: string;
  code: string;
  documentCount: number;
  pendingCount: number;
  image: string | null;
  color: string | null;
  isDemo?: boolean;
}
