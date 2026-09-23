import { Body, Controller, Delete, ForbiddenException, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { RequiresAccess } from '../../../../shared/infrastructure/http/access/requires-access.decorator';
import { CurrentMember } from '../../../../shared/infrastructure/http/access/current-member.decorator';
import { GetScheduleBoardUseCase } from '../../application/get-schedule-board/get-schedule-board.use-case';
import { ListScheduleEventsUseCase } from '../../application/list-schedule-events/list-schedule-events.use-case';
import { CreateScheduleEventUseCase } from '../../application/create-schedule-event/create-schedule-event.use-case';
import { UpdateScheduleEventUseCase } from '../../application/update-schedule-event/update-schedule-event.use-case';
import { DeleteScheduleEventUseCase } from '../../application/delete-schedule-event/delete-schedule-event.use-case';
import { ListSchedulableProjectsUseCase } from '../../application/list-schedulable-projects/list-schedulable-projects.use-case';
import { GetScheduleBoardQueryDto } from './dtos/get-schedule-board.query.dto';
import { ListScheduleEventsQueryDto } from './dtos/list-schedule-events.query.dto';
import { CreateScheduleEventDto } from './dtos/create-schedule-event.dto';
import { UpdateScheduleEventDto } from './dtos/update-schedule-event.dto';
import { ScheduleEventResponse } from './schedule-event.response';
import { ScheduleBoardResponse } from './schedule-board.response';
import { SchedulableProjectResponse } from './schedulable-project.response';
import { ScheduleAccessSnapshot } from '../../application/schedule-access';

interface ScheduleAccessMember {
  canAccess(module: 'projects' | 'staff' | 'equipment', level: 'view' | 'edit'): boolean;
}

function scheduleAccessFor(member: ScheduleAccessMember): ScheduleAccessSnapshot {
  const levelFor = (module: 'projects' | 'staff' | 'equipment'): 'none' | 'view' | 'edit' => {
    if (member.canAccess(module, 'edit')) return 'edit';
    if (member.canAccess(module, 'view')) return 'view';
    return 'none';
  };

  return {
    projects: levelFor('projects'),
    staff: levelFor('staff'),
    equipment: levelFor('equipment'),
  };
}

@RequiresAccess('calendar', 'view')
@RequiresAccess('projects', 'view')
@Controller('schedule')
export class ScheduleController {
  constructor(
    private readonly getScheduleBoardUseCase: GetScheduleBoardUseCase,
    private readonly listScheduleEventsUseCase: ListScheduleEventsUseCase,
    private readonly createScheduleEventUseCase: CreateScheduleEventUseCase,
    private readonly updateScheduleEventUseCase: UpdateScheduleEventUseCase,
    private readonly deleteScheduleEventUseCase: DeleteScheduleEventUseCase,
    private readonly listSchedulableProjectsUseCase: ListSchedulableProjectsUseCase,
  ) {}

  @Get('board')
  async board(
    @Query() query: GetScheduleBoardQueryDto,
    @CurrentMember() member: ScheduleAccessMember,
  ): Promise<ScheduleBoardResponse> {
    const board = await this.getScheduleBoardUseCase.execute(
      { from: query.from, to: query.to },
      scheduleAccessFor(member),
    );

    return ScheduleBoardResponse.fromDomain(board);
  }

  @Get('events')
  async events(
    @Query() query: ListScheduleEventsQueryDto,
    @CurrentMember() member: ScheduleAccessMember,
  ): Promise<ScheduleEventResponse[]> {
    const views = await this.listScheduleEventsUseCase.execute({
      from: query.from,
      to: query.to,
      projectId: query.projectId,
      staffMemberId: query.staffMemberId,
    }, scheduleAccessFor(member));

    return views.map((view) => ScheduleEventResponse.fromView(view));
  }

  @RequiresAccess('calendar', 'edit')
  @RequiresAccess('projects', 'edit')
  @Post('events')
  @HttpCode(201)
  async create(
    @Body() dto: CreateScheduleEventDto,
    @CurrentMember() member: ScheduleAccessMember,
  ): Promise<ScheduleEventResponse> {
    const view = await this.createScheduleEventUseCase.execute({
      projectId: dto.projectId,
      title: dto.title,
      notes: dto.notes,
      days: dto.days,
      staffMemberIds: dto.staffMemberIds,
      equipment: dto.equipment,
    }, scheduleAccessFor(member));

    if (view === null) {
      throw new ForbiddenException();
    }

    return ScheduleEventResponse.fromView(view);
  }

  @RequiresAccess('calendar', 'edit')
  @RequiresAccess('projects', 'edit')
  @Patch('events/:id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateScheduleEventDto,
    @CurrentMember() member: ScheduleAccessMember,
  ): Promise<ScheduleEventResponse> {
    const view = await this.updateScheduleEventUseCase.execute({
      id,
      projectId: dto.projectId,
      title: dto.title,
      notes: dto.notes,
      days: dto.days,
      staffMemberIds: dto.staffMemberIds,
      equipment: dto.equipment,
    }, scheduleAccessFor(member));

    if (view === null) {
      throw new ForbiddenException();
    }

    return ScheduleEventResponse.fromView(view);
  }

  @RequiresAccess('calendar', 'edit')
  @RequiresAccess('projects', 'edit')
  @Delete('events/:id')
  @HttpCode(204)
  async remove(@Param('id') id: string, @CurrentMember() member: ScheduleAccessMember): Promise<void> {
    const removed = await this.deleteScheduleEventUseCase.execute(id, scheduleAccessFor(member));

    if (!removed) {
      throw new ForbiddenException();
    }
  }

  @Get('schedulable-projects')
  async schedulableProjects(@CurrentMember() member: ScheduleAccessMember): Promise<SchedulableProjectResponse[]> {
    const projects = await this.listSchedulableProjectsUseCase.execute(scheduleAccessFor(member));

    return projects.map((project) => SchedulableProjectResponse.fromView(project));
  }
}
