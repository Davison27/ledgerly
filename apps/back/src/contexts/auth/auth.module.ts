import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BOOTSTRAP_ADMIN_EMAIL, BootstrapFirstAdminUseCase } from './application/bootstrap-first-admin/bootstrap-first-admin.use-case';
import { CompleteGoogleLoginUseCase } from './application/complete-google-login/complete-google-login.use-case';
import { GetAuthStatusUseCase } from './application/get-auth-status/get-auth-status.use-case';
import { GetCurrentMemberUseCase } from './application/get-current-member/get-current-member.use-case';
import { InviteWorkspaceMemberUseCase } from './application/invite-workspace-member/invite-workspace-member.use-case';
import { ListWorkspaceMembersUseCase } from './application/list-workspace-members/list-workspace-members.use-case';
import { LogoutUseCase } from './application/logout/logout.use-case';
import { PurgeExpiredSessionsUseCase } from './application/purge-expired-sessions/purge-expired-sessions.use-case';
import { RemoveWorkspaceMemberUseCase } from './application/remove-workspace-member/remove-workspace-member.use-case';
import { StartGoogleLoginUseCase } from './application/start-google-login/start-google-login.use-case';
import { UpdateWorkspaceMemberUseCase } from './application/update-workspace-member/update-workspace-member.use-case';
import { GOOGLE_IDENTITY } from './domain/google-identity.port';
import { LOGIN_ATTEMPT_REPOSITORY } from './domain/login-attempt.repository';
import { SESSION_REPOSITORY } from './domain/session.repository';
import { TOKEN_GENERATOR } from './domain/token-generator.port';
import { WORKSPACE_MEMBER_REPOSITORY } from './domain/workspace-member.repository';
import { NodeTokenGenerator } from './infrastructure/crypto/node-token-generator';
import { GoogleOAuthIdentity } from './infrastructure/google/google-oauth-identity';
import { AuthController } from './infrastructure/http/auth.controller';
import { WorkspaceMembersController } from './infrastructure/http/workspace-members.controller';
import { LoginAttemptOrmEntity } from './infrastructure/persistence/login-attempt.orm-entity';
import { SessionOrmEntity } from './infrastructure/persistence/session.orm-entity';
import { TypeOrmLoginAttemptRepository } from './infrastructure/persistence/typeorm-login-attempt.repository';
import { TypeOrmSessionRepository } from './infrastructure/persistence/typeorm-session.repository';
import { TypeOrmWorkspaceMemberRepository } from './infrastructure/persistence/typeorm-workspace-member.repository';
import { WorkspaceMemberOrmEntity } from './infrastructure/persistence/workspace-member.orm-entity';
import { ExpiredAuthCleanupScheduler } from './infrastructure/scheduling/expired-auth-cleanup.scheduler';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([WorkspaceMemberOrmEntity, SessionOrmEntity, LoginAttemptOrmEntity]),
  ],
  controllers: [AuthController, WorkspaceMembersController],
  providers: [
    GetAuthStatusUseCase,
    BootstrapFirstAdminUseCase,
    StartGoogleLoginUseCase,
    CompleteGoogleLoginUseCase,
    LogoutUseCase,
    GetCurrentMemberUseCase,
    ListWorkspaceMembersUseCase,
    InviteWorkspaceMemberUseCase,
    UpdateWorkspaceMemberUseCase,
    RemoveWorkspaceMemberUseCase,
    PurgeExpiredSessionsUseCase,
    ExpiredAuthCleanupScheduler,
    { provide: WORKSPACE_MEMBER_REPOSITORY, useClass: TypeOrmWorkspaceMemberRepository },
    { provide: SESSION_REPOSITORY, useClass: TypeOrmSessionRepository },
    { provide: LOGIN_ATTEMPT_REPOSITORY, useClass: TypeOrmLoginAttemptRepository },
    { provide: TOKEN_GENERATOR, useClass: NodeTokenGenerator },
    { provide: GOOGLE_IDENTITY, useClass: GoogleOAuthIdentity },
    {
      provide: BOOTSTRAP_ADMIN_EMAIL,
      useFactory: (configService: ConfigService) => configService.get<string>('BOOTSTRAP_ADMIN_EMAIL'),
      inject: [ConfigService],
    },
  ],
  exports: [WORKSPACE_MEMBER_REPOSITORY, SESSION_REPOSITORY, TOKEN_GENERATOR],
})
export class AuthModule {}
