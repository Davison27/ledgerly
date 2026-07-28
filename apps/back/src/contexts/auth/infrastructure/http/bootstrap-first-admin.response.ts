import { WorkspaceMember } from '../../domain/workspace-member';

export class BootstrapFirstAdminResponse {
  email: string;

  private constructor(email: string) {
    this.email = email;
  }

  static fromDomain(member: WorkspaceMember): BootstrapFirstAdminResponse {
    return new BootstrapFirstAdminResponse(member.getEmail());
  }
}
