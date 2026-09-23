import { Body, Controller, Delete, ForbiddenException, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { RequiresAccess } from '../../../../shared/infrastructure/http/access/requires-access.decorator';
import { CurrentMember } from '../../../../shared/infrastructure/http/access/current-member.decorator';
import { GetScheduleBoardUseCase } from '../../application/get-schedule-board/get-schedule-board.use-case';
import { ListScheduleEventsUseCase } from '../../application/list-schedule-events/list-schedule-events.use-case';
import { CreateScheduleEventUseCase } from '../../application/create-schedule-event/create-schedule-event.use-case';
import { UpdateScheduleEventUseCase } from '../../application/update-schedule-event/update-schedule-event.use-case';
import { DeleteScheduleEventUseCase } from '../../application/delete-schedule-event/delete-schedule-event.use-case';
import { ListSchedulableProjectsUseCase } from '../../application/list-schedulable-projects/list-schedulable-projects.use-case';
import { GetCalendarEditorBoardUseCase } from '../../application/get-calendar-editor-board/get-calendar-editor-board.use-case';
import { ListCalendarEditorProjectsUseCase } from '../../application/list-calendar-editor-projects/list-calendar-editor-projects.use-case';
import { ListCalendarEditorStaffUseCase } from '../../application/list-calendar-editor-staff/list-calendar-editor-staff.use-case';
import { ListCalendarEditorEquipmentUseCase } from '../../application/list-calendar-editor-equipment/list-calendar-editor-equipment.use-case';
import { GetScheduleBoardQueryDto } from './dtos/get-schedule-board.query.dto';
import { ListScheduleEventsQueryDto } from './dtos/list-schedule-events.query.dto';
import { CreateScheduleEventDto } from './dtos/create-schedule-event.dto';
import { UpdateScheduleEventDto } from './dtos/update-schedule-event.dto';
import { ScheduleEventResponse } from './schedule-event.response';
import { ScheduleBoardResponse } from './schedule-board.response';
import { SchedulableProjectResponse } from './schedulable-project.response';
import { ScheduleAccessSnapshot, ScheduleWriteAccess } from '../../application/schedule-access';
import { ScheduleEditorEventResponse } from './schedule-editor-event.response';
import { ScheduleEditorSelectorResponse } from './schedule-editor-selector.response';
import { ScheduleEventMutationDto, ScheduleEventMutationResponse } from './schedule-event-mutation.response';
import { GetCalendarEditorBoardQueryDto } from './dtos/get-calendar-editor-board.query.dto';

interface ScheduleAccessMember {
  canAccess(module: 'calendar' | 'projects' | 'staff' | 'equipment', level: 'view' | 'edit'): boolean;
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

function scheduleWriteAccessFor(member: ScheduleAccessMember): ScheduleWriteAccess {
  return { calendar: member.canAccess('calendar', 'edit') ? 'edit' : 'none' };
}

@Controller('schedule')
export class ScheduleController {
  constructor(
    private readonly getScheduleBoardUseCase: GetScheduleBoardUseCase,
    private readonly listScheduleEventsUseCase: ListScheduleEventsUseCase,
    private readonly createScheduleEventUseCase: CreateScheduleEventUseCase,
    private readonly updateScheduleEventUseCase: UpdateScheduleEventUseCase,
    private readonly deleteScheduleEventUseCase: DeleteScheduleEventUseCase,
    private readonly listSchedulableProjectsUseCase: ListSchedulableProjectsUseCase,
    private readonly getCalendarEditorBoardUseCase: GetCalendarEditorBoardUseCase,
    private readonly listCalendarEditorProjectsUseCase: ListCalendarEditorProjectsUseCase,
    private readonly listCalendarEditorStaffUseCase: ListCalendarEditorStaffUseCase,
    private readonly listCalendarEditorEquipmentUseCase: ListCalendarEditorEquipmentUseCase,
  ) {}

  @RequiresAccess('calendar', 'view')
  @RequiresAccess('projects', 'view')
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

  @RequiresAccess('calendar', 'view')
  @RequiresAccess('projects', 'view')
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
  @Post('events')
  @HttpCode(201)
  async create(
    @Body() dto: CreateScheduleEventDto,
    @CurrentMember() member: ScheduleAccessMember,
  ): Promise<ScheduleEventMutationDto> {
    const view = await this.createScheduleEventUseCase.execute({
      projectId: dto.projectId,
      title: dto.title,
      notes: dto.notes,
      days: dto.days,
      staffMemberIds: dto.staffMemberIds,
      equipment: dto.equipment,
    }, scheduleWriteAccessFor(member));

    if (view === null) {
      throw new ForbiddenException();
    }

    return new ScheduleEventMutationResponse(view.event.id);
  }

  @RequiresAccess('calendar', 'edit')
  @Patch('events/:id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateScheduleEventDto,
    @CurrentMember() member: ScheduleAccessMember,
  ): Promise<ScheduleEventMutationDto> {
    const view = await this.updateScheduleEventUseCase.execute({
      id,
      projectId: dto.projectId,
      title: dto.title,
      notes: dto.notes,
      days: dto.days,
      staffMemberIds: dto.staffMemberIds,
      equipment: dto.equipment,
    }, scheduleWriteAccessFor(member));

    if (view === null) {
      throw new ForbiddenException();
    }

    return new ScheduleEventMutationResponse(view.event.id);
  }

  @RequiresAccess('calendar', 'edit')
  @Delete('events/:id')
  @HttpCode(204)
  async remove(@Param('id') id: string, @CurrentMember() member: ScheduleAccessMember): Promise<void> {
    const removed = await this.deleteScheduleEventUseCase.execute(id, scheduleWriteAccessFor(member));

    if (!removed) {
      throw new ForbiddenException();
    }
  }

  @RequiresAccess('calendar', 'view')
  @RequiresAccess('projects', 'view')
  @Get('schedulable-projects')
  async schedulableProjects(@CurrentMember() member: ScheduleAccessMember): Promise<SchedulableProjectResponse[]> {
    const projects = await this.listSchedulableProjectsUseCase.execute(scheduleAccessFor(member));

    return projects.map((project) => SchedulableProjectResponse.fromView(project));
  }

  @RequiresAccess('calendar', 'edit')
  @Get('editor/board')
  async editorBoard(@Query() query: GetCalendarEditorBoardQueryDto): Promise<ScheduleEditorEventResponse[]> {
    const events = await this.getCalendarEditorBoardUseCase.execute({ from: query.from, to: query.to });
    return events.map((event) => ScheduleEditorEventResponse.fromEvent(event));
  }

  @RequiresAccess('calendar', 'edit')
  @Get('editor/projects')
  async editorProjects(): Promise<ScheduleEditorSelectorResponse[]> {
    const projects = await this.listCalendarEditorProjectsUseCase.execute();
    return projects.map((option) => ScheduleEditorSelectorResponse.fromOption(option));
  }

  @RequiresAccess('calendar', 'edit')
  @Get('editor/staff')
  async editorStaff(): Promise<ScheduleEditorSelectorResponse[]> {
    const staff = await this.listCalendarEditorStaffUseCase.execute();
    return staff.map((option) => ScheduleEditorSelectorResponse.fromOption(option));
  }

  @RequiresAccess('calendar', 'edit')
  @Get('editor/equipment')
  async editorEquipment(): Promise<ScheduleEditorSelectorResponse[]> {
    const equipment = await this.listCalendarEditorEquipmentUseCase.execute();
    return equipment.map((option) => ScheduleEditorSelectorResponse.fromOption(option));
  }
}
