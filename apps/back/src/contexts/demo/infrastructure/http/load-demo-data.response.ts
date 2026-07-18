import { LoadDemoDataResult } from '../../application/load-demo-data/load-demo-data.result';

export class LoadDemoDataResponse {
  created: boolean;
  projectId: string | null;
  documentCount: number;

  static fromResult(result: LoadDemoDataResult): LoadDemoDataResponse {
    const response = new LoadDemoDataResponse();

    response.created = result.created;
    response.projectId = result.projectId;
    response.documentCount = result.documentCount;

    return response;
  }
}
