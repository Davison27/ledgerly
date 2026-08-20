import { EntityNotFoundException } from '../../../../shared/domain/entity-not-found.exception';
import { Product } from '../../../products/domain/product';
import { ProductRepository } from '../../../products/domain/product.repository';
import { Project } from '../../domain/project';
import { ProjectRepository } from '../../domain/project.repository';
import {
  ProjectProductRecord,
  ProjectProductRepository,
  ProjectLeaseExpenseRow,
} from '../../domain/project-product.repository';
import { ProjectProductsUseCase } from './project-products.use-case';

class InMemoryProjectProductRepository implements ProjectProductRepository {
  readonly deleteCalls: Array<{ projectId: string; productId: string }> = [];

  constructor(private records: ProjectProductRecord[] = []) {}

  findByProjectId(projectId: string): Promise<ProjectProductRecord[]> {
    return Promise.resolve(this.records.filter((record) => record.projectId === projectId));
  }

  save(input: Pick<ProjectProductRecord, 'projectId' | 'productId' | 'leaseExpense' | 'leaseExpenseDate'>): Promise<void> {
    this.records.push({
      ...input,
      name: 'Product',
      reference: null,
      category: null,
      image: null,
      leasingMonthlyFee: null,
    });
    return Promise.resolve();
  }

  delete(projectId: string, productId: string): Promise<boolean> {
    this.deleteCalls.push({ projectId, productId });
    const originalLength = this.records.length;
    this.records = this.records.filter(
      (record) => record.projectId !== projectId || record.productId !== productId,
    );
    return Promise.resolve(this.records.length !== originalLength);
  }

  deleteByProjectId(projectId: string): Promise<void> {
    this.records = this.records.filter((record) => record.projectId !== projectId);
    return Promise.resolve();
  }

  findAllLeaseExpenseRows(): Promise<ProjectLeaseExpenseRow[]> {
    return Promise.resolve([]);
  }

  snapshot(): ProjectProductRecord[] {
    return [...this.records];
  }
}

class ExistingProjectRepository implements ProjectRepository {
  constructor(private readonly projectIds: Set<string>) {}

  findById(id: string): Promise<Project | null> {
    return Promise.resolve(this.projectIds.has(id) ? ({} as Project) : null);
  }

  findAllSummaries(): Promise<never[]> {
    return Promise.resolve([]);
  }

  findSummaryById(): Promise<null> {
    return Promise.resolve(null);
  }

  findByCode(): Promise<null> {
    return Promise.resolve(null);
  }

  save(): Promise<void> {
    return Promise.resolve();
  }

  delete(): Promise<void> {
    return Promise.resolve();
  }

  findAllForDashboard(): Promise<never[]> {
    return Promise.resolve([]);
  }
}

class ExistingProductRepository implements ProductRepository {
  findById(): Promise<Product | null> {
    return Promise.resolve({} as Product);
  }

  findAll(): Promise<never[]> {
    return Promise.resolve([]);
  }

  findByName(): Promise<null> {
    return Promise.resolve(null);
  }

  save(): Promise<void> {
    return Promise.resolve();
  }

  delete(): Promise<void> {
    return Promise.resolve();
  }
}

const ASSOCIATION: ProjectProductRecord = {
  projectId: 'project-1',
  productId: 'product-1',
  name: 'Product',
  reference: null,
  category: null,
  image: null,
  leasingMonthlyFee: null,
  leaseExpense: null,
  leaseExpenseDate: null,
};

describe('ProjectProductsUseCase', () => {
  it('rejects an unknown or unassociated product without mutating project associations', async () => {
    const repository = new InMemoryProjectProductRepository([ASSOCIATION]);
    const useCase = new ProjectProductsUseCase(
      repository,
      new ExistingProjectRepository(new Set(['project-1'])),
      new ExistingProductRepository(),
    );

    await expect(useCase.remove('project-1', 'product-2')).rejects.toThrow(EntityNotFoundException);

    expect(repository.deleteCalls).toEqual([{ projectId: 'project-1', productId: 'product-2' }]);
    expect(repository.snapshot()).toEqual([ASSOCIATION]);
  });

  it('removes an existing project-product association', async () => {
    const repository = new InMemoryProjectProductRepository([ASSOCIATION]);
    const useCase = new ProjectProductsUseCase(
      repository,
      new ExistingProjectRepository(new Set(['project-1'])),
      new ExistingProductRepository(),
    );

    await useCase.remove('project-1', 'product-1');

    expect(repository.snapshot()).toEqual([]);
  });
});
