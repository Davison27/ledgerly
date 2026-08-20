import { CompanyDocumentType } from '../../domain/company-document-type';

export class CompanyDocumentTypeResponse {
  id: string;
  code: string;
  name: string;
  isSystem: boolean;

  static fromDomain(type: CompanyDocumentType): CompanyDocumentTypeResponse {
    const response = new CompanyDocumentTypeResponse();

    response.id = type.id;
    response.code = type.code;
    response.name = type.name;
    response.isSystem = type.isSystem;

    return response;
  }
}
