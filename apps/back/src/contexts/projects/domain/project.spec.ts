import { Project, ProjectPrimitives } from './project';
import { InvalidValueException } from '../../../shared/domain/invalid-value.exception';

function buildPrimitives(overrides: Partial<ProjectPrimitives> = {}): ProjectPrimitives {
  return {
    id: 'project-1',
    name: 'Acme Project',
    code: 'ACME-001',
    type: 'construction',
    status: 'active',
    description: null,
    clientCompany: null,
    clientTaxId: null,
    contactName: null,
    contactEmail: null,
    contactPhone: null,
    address: null,
    startDate: null,
    endDate: null,
    budget: null,
    currency: 'EUR',
    fiscalYear: null,
    manager: null,
    image: null,
    color: null,
    ...overrides,
  };
}

describe('Project', () => {
  it('creates a project with a valid color', () => {
    const project = Project.create(buildPrimitives({ color: 'terracotta' }));

    expect(project.color).toBe('terracotta');
  });

  it('creates a project with a null color', () => {
    const project = Project.create(buildPrimitives({ color: null }));

    expect(project.color).toBeNull();
  });

  it('throws InvalidValueException for an invalid color', () => {
    expect(() =>
      Project.create(buildPrimitives({ color: 'chartreuse' as ProjectPrimitives['color'] })),
    ).toThrow(InvalidValueException);
  });

  describe('changeColor', () => {
    it('changes the color to a valid token', () => {
      const project = Project.create(buildPrimitives());

      project.changeColor('indigo');

      expect(project.color).toBe('indigo');
    });

    it('changes the color back to null', () => {
      const project = Project.create(buildPrimitives({ color: 'indigo' }));

      project.changeColor(null);

      expect(project.color).toBeNull();
    });

    it('throws InvalidValueException for an invalid color', () => {
      const project = Project.create(buildPrimitives());

      expect(() => project.changeColor('chartreuse' as ProjectPrimitives['color'])).toThrow(
        InvalidValueException,
      );
    });
  });
});
