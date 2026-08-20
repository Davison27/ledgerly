import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { EQUIPMENT_REPOSITORY, EquipmentRepository } from '../../../equipment/domain/equipment.repository';
import { EquipmentNotFoundException } from '../../../equipment/domain/errors/equipment-not-found.exception';
import { PROJECT_EQUIPMENT_REPOSITORY, ProjectEquipmentRecord, ProjectEquipmentRepository } from '../../domain/project-equipment.repository';
import { PROJECT_REPOSITORY, ProjectRepository } from '../../domain/project.repository';
import { ProjectNotFoundException } from '../../domain/errors/project-not-found.exception';
import { EntityNotFoundException } from '../../../../shared/domain/entity-not-found.exception';

export interface SaveProjectEquipmentCommand {
  projectId: string;
  equipmentId: string;
  leaseExpense?: number | null;
  leaseExpenseDate?: string | null;
}

@Injectable()
export class ProjectEquipmentUseCase {
  constructor(
    @Inject(PROJECT_EQUIPMENT_REPOSITORY) private readonly projectEquipment: ProjectEquipmentRepository,
    @Inject(PROJECT_REPOSITORY) private readonly projects: ProjectRepository,
    @Inject(EQUIPMENT_REPOSITORY) private readonly equipment: EquipmentRepository,
  ) {}

  async list(projectId: string): Promise<ProjectEquipmentRecord[]> {
    await this.ensureProject(projectId);
    return this.projectEquipment.findByProjectId(projectId);
  }

  async save(command: SaveProjectEquipmentCommand): Promise<ProjectEquipmentRecord[]> {
    await this.ensureProject(command.projectId);
    const equipment = await this.equipment.findById(command.equipmentId);
    if (equipment === null) throw new EquipmentNotFoundException(command.equipmentId);
    const amount = command.leaseExpense ?? null;
    const date = command.leaseExpenseDate ?? null;
    if (amount !== null && amount < 0) throw new BadRequestException('Project lease expense must not be negative');
    if (amount !== null && date === null) throw new BadRequestException('Project lease expense date is required');
    if (date !== null && !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new BadRequestException('Project lease expense date must be a valid ISO date');
    await this.projectEquipment.save({ projectId: command.projectId, equipmentId: command.equipmentId, leaseExpense: amount, leaseExpenseDate: amount === null ? null : date });
    return this.projectEquipment.findByProjectId(command.projectId);
  }

  async remove(projectId: string, equipmentId: string): Promise<void> {
    await this.ensureProject(projectId);
    const deleted = await this.projectEquipment.delete(projectId, equipmentId);

    if (!deleted) {
      throw new EntityNotFoundException('Project equipment', equipmentId);
    }
  }

  private async ensureProject(projectId: string): Promise<void> {
    if (await this.projects.findById(projectId)) return;
    throw new ProjectNotFoundException(projectId);
  }
}
