import { EntityNotFoundException } from '../../../shared/domain/entity-not-found.exception';
import { InvalidValueException } from '../../../shared/domain/invalid-value.exception';
import { ProjectChecklist, ProjectChecklistPrimitives } from './project-checklist';

function buildChecklist(overrides: Partial<ProjectChecklistPrimitives> = {}): ProjectChecklistPrimitives {
  return {
    projectId: 'project-1',
    sourceTemplateId: 'template-1',
    name: 'Preparation',
    items: [
      { id: 'item-1', text: 'First', position: 0, completed: false },
      { id: 'item-2', text: 'Second', position: 1, completed: false },
    ],
    ...overrides,
  };
}

describe('ProjectChecklist', () => {
  it('normalizes its text and returns ordered items', () => {
    const checklist = ProjectChecklist.create(buildChecklist({
      name: ' Preparation ',
      items: [
        { id: 'item-2', text: ' Second ', position: 1, completed: true },
        { id: 'item-1', text: ' First ', position: 0, completed: false },
      ],
    }));

    expect(checklist.toPrimitives()).toEqual({
      projectId: 'project-1',
      sourceTemplateId: 'template-1',
      name: 'Preparation',
      items: [
        { id: 'item-1', text: 'First', position: 0, completed: false },
        { id: 'item-2', text: 'Second', position: 1, completed: true },
      ],
    });
  });

  it('rejects invalid name, text, completion state, identity, and order', () => {
    expect(() => ProjectChecklist.create(buildChecklist({ name: ' ' }))).toThrow(InvalidValueException);
    expect(() => ProjectChecklist.create(buildChecklist({
      items: [{ id: 'item-1', text: ' ', position: 0, completed: false }],
    }))).toThrow(InvalidValueException);
    expect(() => ProjectChecklist.create(buildChecklist({
      items: [{ id: 'item-1', text: 'First', position: 0, completed: 'yes' as unknown as boolean }],
    }))).toThrow(InvalidValueException);
    expect(() => ProjectChecklist.create(buildChecklist({
      items: [
        { id: 'item-1', text: 'First', position: 0, completed: false },
        { id: 'item-1', text: 'Second', position: 1, completed: false },
      ],
    }))).toThrow(InvalidValueException);
    expect(() => ProjectChecklist.create(buildChecklist({
      items: [{ id: 'item-1', text: 'First', position: 1, completed: false }],
    }))).toThrow(InvalidValueException);
  });

  it('adds a trimmed incomplete item at the next position', () => {
    const checklist = ProjectChecklist.create(buildChecklist());

    expect(checklist.addItem('item-3', ' Third ')).toEqual({
      id: 'item-3', text: 'Third', position: 2, completed: false,
    });
    expect(checklist.items.map((item) => item.position)).toEqual([0, 1, 2]);
  });

  it('trims updates, accepts false values, and reorders items consistently', () => {
    const checklist = ProjectChecklist.create(buildChecklist({
      items: [
        { id: 'item-1', text: 'First', position: 0, completed: true },
        { id: 'item-2', text: 'Second', position: 1, completed: true },
        { id: 'item-3', text: 'Third', position: 2, completed: false },
      ],
    }));

    expect(checklist.updateItem('item-3', { text: ' Updated ', completed: false, position: 0 })).toEqual({
      text: 'Updated', completed: false, position: 0,
    });
    expect(checklist.items).toEqual([
      { id: 'item-3', text: 'Updated', position: 0, completed: false },
      { id: 'item-1', text: 'First', position: 1, completed: true },
      { id: 'item-2', text: 'Second', position: 2, completed: true },
    ]);
  });

  it('rejects empty patches, invalid values, and items outside the aggregate', () => {
    const checklist = ProjectChecklist.create(buildChecklist());

    expect(() => checklist.updateItem('item-1', {})).toThrow(InvalidValueException);
    expect(() => checklist.updateItem('item-1', { text: ' ' })).toThrow(InvalidValueException);
    expect(() => checklist.updateItem('item-1', { position: 2 })).toThrow(InvalidValueException);
    expect(() => checklist.updateItem('missing', { completed: true })).toThrow(EntityNotFoundException);
    expect(() => checklist.removeItem('missing')).toThrow(EntityNotFoundException);
    expect(checklist.items.map((item) => item.position)).toEqual([0, 1]);
  });

  it('removes a member and compacts the remaining positions', () => {
    const checklist = ProjectChecklist.create(buildChecklist());

    checklist.removeItem('item-1');

    expect(checklist.items).toEqual([{ id: 'item-2', text: 'Second', position: 0, completed: false }]);
  });

  it('revalidates changes and rehydrated persistence state', () => {
    const checklist = ProjectChecklist.create(buildChecklist());

    expect(() => checklist.withChanges({ name: ' ' })).toThrow(InvalidValueException);
    expect(() => ProjectChecklist.rehydrate(buildChecklist({
      items: [{ id: 'item-1', text: 'First', position: 4, completed: false }],
    }))).toThrow(InvalidValueException);
  });
});
