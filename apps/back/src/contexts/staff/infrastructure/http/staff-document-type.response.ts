import { StaffDocumentType } from '../../domain/staff-document-type';

export class StaffDocumentTypeResponse {
  id: string;
  code: string;
  name: string;
  expires: boolean;
  defaultValidityMonths: number | null;
  isSystem: boolean;

  static fromDomain(type: StaffDocumentType): StaffDocumentTypeResponse {
    const response = new StaffDocumentTypeResponse();

    response.id = type.id;
    response.code = type.code;
    response.name = type.name;
    response.expires = type.expires;
    response.defaultValidityMonths = type.defaultValidityMonths;
    response.isSystem = type.isSystem;

    return response;
  }
}
