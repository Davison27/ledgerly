import { WorkspaceMember } from './workspace-member';
import { MemberEmail } from './value-objects/member-email';
import { PermissionMatrix, WORKSPACE_MODULES } from './value-objects/permission-matrix';
import { GoogleIdentityRejectedException } from './errors/google-identity-rejected.exception';

function viewerMatrix(): PermissionMatrix {
  return PermissionMatrix.create(
    WORKSPACE_MODULES.reduce<Record<string, string>>((matrix, module) => {
      matrix[module] = 'view';
      return matrix;
    }, {}),
  );
}

function createInvitedMember(): WorkspaceMember {
  return WorkspaceMember.create({
    id: 'member-1',
    email: MemberEmail.create('person@ledgerly.dev'),
    name: 'Provisional Name',
    permissions: viewerMatrix(),
    status: 'invited',
    invitedAt: new Date('2026-01-01T00:00:00.000Z'),
  });
}

describe('WorkspaceMember', () => {
  it('binds the google account and activates an invited member', () => {
    const member = createInvitedMember();
    const boundAt = new Date('2026-01-02T00:00:00.000Z');

    member.bindGoogleAccount('google-subject-1', 'Real Name', boundAt);

    expect(member.getGoogleSubject()).toBe('google-subject-1');
    expect(member.getName()).toBe('Real Name');
    expect(member.getStatus()).toBe('active');
    expect(member.getJoinedAt()).toEqual(boundAt);
  });

  it('does not transition an already active member back through joinedAt', () => {
    const member = createInvitedMember();
    const firstLogin = new Date('2026-01-02T00:00:00.000Z');
    member.bindGoogleAccount('google-subject-1', 'Real Name', firstLogin);

    const secondLogin = new Date('2026-01-03T00:00:00.000Z');
    member.bindGoogleAccount('google-subject-1', 'Real Name Again', secondLogin);

    expect(member.getStatus()).toBe('active');
    expect(member.getJoinedAt()).toEqual(firstLogin);
  });

  it('throws when the google subject does not match the one already bound', () => {
    const member = createInvitedMember();
    member.bindGoogleAccount('google-subject-1', 'Real Name', new Date('2026-01-02T00:00:00.000Z'));

    expect(() =>
      member.bindGoogleAccount('google-subject-2', 'Real Name', new Date('2026-01-03T00:00:00.000Z')),
    ).toThrow(GoogleIdentityRejectedException);
  });

  it('throws and does not reactivate a disabled member', () => {
    const member = createInvitedMember();
    member.bindGoogleAccount('google-subject-1', 'Real Name', new Date('2026-01-02T00:00:00.000Z'));
    member.changeStatus('disabled');

    expect(() =>
      member.bindGoogleAccount('google-subject-1', 'Real Name', new Date('2026-01-03T00:00:00.000Z')),
    ).toThrow(GoogleIdentityRejectedException);
    expect(member.getStatus()).toBe('disabled');
  });

  it('derives isAdmin from the permission matrix', () => {
    const admin = WorkspaceMember.create({
      id: 'member-2',
      email: MemberEmail.create('admin@ledgerly.dev'),
      name: 'Admin',
      permissions: PermissionMatrix.create(
        WORKSPACE_MODULES.reduce<Record<string, string>>((matrix, module) => {
          matrix[module] = module === 'dashboard' ? 'view' : 'edit';
          return matrix;
        }, {}),
      ),
      status: 'active',
      invitedAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    expect(admin.isAdmin()).toBe(true);
    expect(admin.canAccess('documents', 'edit')).toBe(true);
  });
});
