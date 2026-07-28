import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { RequiresAccess } from '../../../../shared/infrastructure/http/access/requires-access.decorator';
import { ListStaffMembersUseCase } from '../../application/list-staff-members/list-staff-members.use-case';
import { GetStaffMemberUseCase } from '../../application/get-staff-member/get-staff-member.use-case';
import { CreateStaffMemberUseCase } from '../../application/create-staff-member/create-staff-member.use-case';
import { UpdateStaffMemberUseCase } from '../../application/update-staff-member/update-staff-member.use-case';
import { DeleteStaffMemberUseCase } from '../../application/delete-staff-member/delete-staff-member.use-case';
import { CreateStaffMemberDto } from './dtos/create-staff-member.dto';
import { UpdateStaffMemberDto } from './dtos/update-staff-member.dto';
import { StaffMemberResponse } from './staff-member.response';

@RequiresAccess('staff', 'view')
@Controller('staff')
export class StaffController {
  constructor(
    private readonly listStaffMembersUseCase: ListStaffMembersUseCase,
    private readonly getStaffMemberUseCase: GetStaffMemberUseCase,
    private readonly createStaffMemberUseCase: CreateStaffMemberUseCase,
    private readonly updateStaffMemberUseCase: UpdateStaffMemberUseCase,
    private readonly deleteStaffMemberUseCase: DeleteStaffMemberUseCase,
  ) {}

  @Get()
  async list(): Promise<StaffMemberResponse[]> {
    const staffMembers = await this.listStaffMembersUseCase.execute();

    return staffMembers.map((staffMember) => StaffMemberResponse.fromDomain(staffMember));
  }

  @RequiresAccess('staff', 'edit')
  @Post()
  @HttpCode(201)
  async create(@Body() dto: CreateStaffMemberDto): Promise<StaffMemberResponse> {
    const staffMember = await this.createStaffMemberUseCase.execute({
      firstName: dto.firstName,
      lastName: dto.lastName,
      taxId: dto.taxId,
      email: dto.email,
      phone: dto.phone,
      position: dto.position,
      hireDate: dto.hireDate,
      endDate: dto.endDate,
      notes: dto.notes,
    });

    return StaffMemberResponse.fromDomain(staffMember);
  }

  @Get(':id')
  async get(@Param('id') id: string): Promise<StaffMemberResponse> {
    const staffMember = await this.getStaffMemberUseCase.execute(id);

    return StaffMemberResponse.fromDomain(staffMember);
  }

  @RequiresAccess('staff', 'edit')
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateStaffMemberDto,
  ): Promise<StaffMemberResponse> {
    const staffMember = await this.updateStaffMemberUseCase.execute({
      id,
      firstName: dto.firstName,
      lastName: dto.lastName,
      taxId: dto.taxId,
      email: dto.email,
      phone: dto.phone,
      position: dto.position,
      hireDate: dto.hireDate,
      endDate: dto.endDate,
      notes: dto.notes,
    });

    return StaffMemberResponse.fromDomain(staffMember);
  }

  @RequiresAccess('staff', 'edit')
  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string): Promise<void> {
    await this.deleteStaffMemberUseCase.execute(id);
  }
}
