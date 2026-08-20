import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { RequiresAccess } from '../../../../shared/infrastructure/http/access/requires-access.decorator';
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

@RequiresAccess('calendar', 'view')
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
  async board(@Query() query: GetScheduleBoardQueryDto): Promise<ScheduleBoardResponse> {
    const board = await this.getScheduleBoardUseCase.execute({ from: query.from, to: query.to });

    return ScheduleBoardResponse.fromDomain(board);
  }

  @Get('events')
  async events(@Query() query: ListScheduleEventsQueryDto): Promise<ScheduleEventResponse[]> {
    const views = await this.listScheduleEventsUseCase.execute({
      from: query.from,
      to: query.to,
      projectId: query.projectId,
      staffMemberId: query.staffMemberId,
    });

    return views.map((view) => ScheduleEventResponse.fromView(view));
  }

  @RequiresAccess('calendar', 'edit')
  @Post('events')
  @HttpCode(201)
  async create(@Body() dto: CreateScheduleEventDto): Promise<ScheduleEventResponse> {
    const view = await this.createScheduleEventUseCase.execute({
      projectId: dto.projectId,
      title: dto.title,
      notes: dto.notes,
      days: dto.days,
      staffMemberIds: dto.staffMemberIds,
      equipment: dto.equipment,
    });

    return ScheduleEventResponse.fromView(view);
  }

  @RequiresAccess('calendar', 'edit')
  @Patch('events/:id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateScheduleEventDto,
  ): Promise<ScheduleEventResponse> {
    const view = await this.updateScheduleEventUseCase.execute({
      id,
      projectId: dto.projectId,
      title: dto.title,
      notes: dto.notes,
      days: dto.days,
      staffMemberIds: dto.staffMemberIds,
      equipment: dto.equipment,
    });

    return ScheduleEventResponse.fromView(view);
  }

  @RequiresAccess('calendar', 'edit')
  @Delete('events/:id')
  @HttpCode(204)
  async remove(@Param('id') id: string): Promise<void> {
    await this.deleteScheduleEventUseCase.execute(id);
  }

  @Get('schedulable-projects')
  async schedulableProjects(): Promise<SchedulableProjectResponse[]> {
    const projects = await this.listSchedulableProjectsUseCase.execute();

    return projects.map((project) => SchedulableProjectResponse.fromView(project));
  }
}
