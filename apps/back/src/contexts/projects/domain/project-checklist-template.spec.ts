import { InvalidValueException } from '../../../shared/domain/invalid-value.exception';
import {
  ProjectChecklistTemplate,
  ProjectChecklistTemplatePrimitives,
} from './project-checklist-template';

function buildTemplate(overrides: Partial<ProjectChecklistTemplatePrimitives> = {}): ProjectChecklistTemplatePrimitives {
  return {
    id: 'template-1',
    name: 'Preparation',
    items: [
      { id: 'item-1', text: 'First', position: 0 },
      { id: 'item-2', text: 'Second', position: 1 },
    ],
    ...overrides,
  };
}

describe('ProjectChecklistTemplate', () => {
  it('normalizes text and returns items in their declared order', () => {
    const template = ProjectChecklistTemplate.create(buildTemplate({
      name: ' Preparation ',
      items: [
        { id: 'item-2', text: ' Second ', position: 1 },
        { id: 'item-1', text: ' First ', position: 0 },
      ],
    }));

    expect(template.toPrimitives()).toEqual({
      id: 'template-1',
      name: 'Preparation',
      items: [
        { id: 'item-1', text: 'First', position: 0 },
        { id: 'item-2', text: 'Second', position: 1 },
      ],
    });
  });

  it('rejects invalid names, item text, identity, and ordering', () => {
    expect(() => ProjectChecklistTemplate.create(buildTemplate({ name: '  ' }))).toThrow(InvalidValueException);
    expect(() => ProjectChecklistTemplate.create(buildTemplate({ name: 'x'.repeat(161) }))).toThrow(
      InvalidValueException,
    );
    expect(() => ProjectChecklistTemplate.create(buildTemplate({
      items: [{ id: 'item-1', text: ' ', position: 0 }],
    }))).toThrow(InvalidValueException);
    expect(() => ProjectChecklistTemplate.create(buildTemplate({
      items: [
        { id: 'item-1', text: 'First', position: 0 },
        { id: 'item-1', text: 'Second', position: 1 },
      ],
    }))).toThrow(InvalidValueException);
    expect(() => ProjectChecklistTemplate.create(buildTemplate({
      items: [{ id: 'item-1', text: 'First', position: 1 }],
    }))).toThrow(InvalidValueException);
  });

  it('revalidates replacements and keeps its identity when changed', () => {
    const template = ProjectChecklistTemplate.create(buildTemplate());
    const changed = template.withChanges({ name: ' Updated ', items: [] });

    expect(changed.toPrimitives()).toEqual({ id: 'template-1', name: 'Updated', items: [] });
    expect(() => template.withChanges({ name: ' ' })).toThrow(InvalidValueException);
  });

  it('does not expose mutable item state', () => {
    const template = ProjectChecklistTemplate.create(buildTemplate());
    const items = template.items;
    items[0].text = 'Changed outside the aggregate';

    expect(template.items[0].text).toBe('First');
  });

  it('rehydrates through the same invariant checks', () => {
    expect(() => ProjectChecklistTemplate.rehydrate(buildTemplate({
      items: [{ id: 'item-1', text: 'First', position: 2 }],
    }))).toThrow(InvalidValueException);
  });
});
