import { StaffMember } from '../../domain/staff-member';

export class StaffMemberResponse {
  id: string;
  firstName: string;
  lastName: string;
  taxId: string | null;
  email: string | null;
  phone: string | null;
  position: string | null;
  hireDate: string | null;
  endDate: string | null;
  notes: string | null;

  static fromDomain(staffMember: StaffMember): StaffMemberResponse {
    const response = new StaffMemberResponse();
    const primitives = staffMember.toPrimitives();

    response.id = primitives.id;
    response.firstName = primitives.firstName;
    response.lastName = primitives.lastName;
    response.taxId = primitives.taxId;
    response.email = primitives.email;
    response.phone = primitives.phone;
    response.position = primitives.position;
    response.hireDate = primitives.hireDate;
    response.endDate = primitives.endDate;
    response.notes = primitives.notes;

    return response;
  }
}
