import { LoadDemoDataResult } from '../../application/load-demo-data/load-demo-data.result';

export class LoadDemoDataResponse {
  created: boolean;
  projectId: string | null;
  documentCount: number;
  staffMemberCount: number;

  static fromResult(result: LoadDemoDataResult): LoadDemoDataResponse {
    const response = new LoadDemoDataResponse();

    response.created = result.created;
    response.projectId = result.projectId;
    response.documentCount = result.documentCount;
    response.staffMemberCount = result.staffMemberCount;

    return response;
  }
}
