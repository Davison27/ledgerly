import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { PRODUCT_REPOSITORY, ProductRepository } from '../../../products/domain/product.repository';
import { ProductNotFoundException } from '../../../products/domain/errors/product-not-found.exception';
import { PROJECT_PRODUCT_REPOSITORY, ProjectProductRecord, ProjectProductRepository } from '../../domain/project-product.repository';
import { PROJECT_REPOSITORY, ProjectRepository } from '../../domain/project.repository';
import { ProjectNotFoundException } from '../../domain/errors/project-not-found.exception';

export interface SaveProjectProductCommand {
  projectId: string;
  productId: string;
  leaseExpense?: number | null;
  leaseExpenseDate?: string | null;
}

@Injectable()
export class ProjectProductsUseCase {
  constructor(
    @Inject(PROJECT_PRODUCT_REPOSITORY) private readonly projectProducts: ProjectProductRepository,
    @Inject(PROJECT_REPOSITORY) private readonly projects: ProjectRepository,
    @Inject(PRODUCT_REPOSITORY) private readonly products: ProductRepository,
  ) {}

  async list(projectId: string): Promise<ProjectProductRecord[]> {
    await this.ensureProject(projectId);
    return this.projectProducts.findByProjectId(projectId);
  }

  async save(command: SaveProjectProductCommand): Promise<ProjectProductRecord[]> {
    await this.ensureProject(command.projectId);
    const product = await this.products.findById(command.productId);
    if (product === null) throw new ProductNotFoundException(command.productId);
    const amount = command.leaseExpense ?? null;
    const date = command.leaseExpenseDate ?? null;
    if (amount !== null && amount < 0) throw new BadRequestException('Project lease expense must not be negative');
    if (amount !== null && date === null) throw new BadRequestException('Project lease expense date is required');
    if (date !== null && !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new BadRequestException('Project lease expense date must be a valid ISO date');
    await this.projectProducts.save({ projectId: command.projectId, productId: command.productId, leaseExpense: amount, leaseExpenseDate: amount === null ? null : date });
    return this.projectProducts.findByProjectId(command.projectId);
  }

  async remove(projectId: string, productId: string): Promise<void> {
    await this.ensureProject(projectId);
    await this.projectProducts.delete(projectId, productId);
  }

  private async ensureProject(projectId: string): Promise<void> {
    if (await this.projects.findById(projectId)) return;
    throw new ProjectNotFoundException(projectId);
  }
}
