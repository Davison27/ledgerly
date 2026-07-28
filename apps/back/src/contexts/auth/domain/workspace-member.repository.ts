import { WorkspaceMember } from './workspace-member';

export const WORKSPACE_MEMBER_REPOSITORY = Symbol('WorkspaceMemberRepository');

export interface WorkspaceMemberRepository {
  findAll(): Promise<WorkspaceMember[]>;
  findById(id: string): Promise<WorkspaceMember | null>;
  findByEmail(email: string): Promise<WorkspaceMember | null>;
  findByGoogleSubject(subject: string): Promise<WorkspaceMember | null>;
  countAll(): Promise<number>;
  countActiveAdmins(): Promise<number>;
  save(member: WorkspaceMember): Promise<void>;
  insertFounder(member: WorkspaceMember): Promise<void>;
  delete(id: string): Promise<void>;
  touchLastActive(memberId: string, at: Date): Promise<void>;
}
