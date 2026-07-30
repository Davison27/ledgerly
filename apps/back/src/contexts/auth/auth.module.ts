import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BOOTSTRAP_ADMIN_EMAIL, BootstrapFirstAdminUseCase } from './application/bootstrap-first-admin/bootstrap-first-admin.use-case';
import { GetCurrentMemberUseCase } from './application/get-current-member/get-current-member.use-case';
import { InviteWorkspaceMemberUseCase } from './application/invite-workspace-member/invite-workspace-member.use-case';
import { ListWorkspaceMembersUseCase } from './application/list-workspace-members/list-workspace-members.use-case';
import { RemoveWorkspaceMemberUseCase } from './application/remove-workspace-member/remove-workspace-member.use-case';
import { UpdateWorkspaceMemberUseCase } from './application/update-workspace-member/update-workspace-member.use-case';
import { WORKSPACE_MEMBER_REPOSITORY } from './domain/workspace-member.repository';
import { AuthController } from './infrastructure/http/auth.controller';
import { WorkspaceMembersController } from './infrastructure/http/workspace-members.controller';
import { TypeOrmWorkspaceMemberRepository } from './infrastructure/persistence/typeorm-workspace-member.repository';
import { WorkspaceMemberOrmEntity } from './infrastructure/persistence/workspace-member.orm-entity';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([WorkspaceMemberOrmEntity]),
  ],
  controllers: [AuthController, WorkspaceMembersController],
  providers: [
    BootstrapFirstAdminUseCase,
    GetCurrentMemberUseCase,
    ListWorkspaceMembersUseCase,
    InviteWorkspaceMemberUseCase,
    UpdateWorkspaceMemberUseCase,
    RemoveWorkspaceMemberUseCase,
    { provide: WORKSPACE_MEMBER_REPOSITORY, useClass: TypeOrmWorkspaceMemberRepository },
    {
      provide: BOOTSTRAP_ADMIN_EMAIL,
      useFactory: (configService: ConfigService) => configService.get<string>('BOOTSTRAP_ADMIN_EMAIL'),
      inject: [ConfigService],
    },
  ],
  exports: [WORKSPACE_MEMBER_REPOSITORY],
})
export class AuthModule {}
