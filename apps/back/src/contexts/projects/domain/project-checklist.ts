import { EntityNotFoundException } from '../../../shared/domain/entity-not-found.exception';
import { InvalidValueException } from '../../../shared/domain/invalid-value.exception';

export interface ProjectChecklistItem {
  id: string;
  text: string;
  position: number;
  completed: boolean;
}

export interface ProjectChecklistPrimitives {
  projectId: string;
  sourceTemplateId: string | null;
  name: string;
  items: ProjectChecklistItem[];
}

export interface ProjectChecklistChanges {
  name?: string;
  items?: ProjectChecklistItem[];
}

export interface ProjectChecklistItemChanges {
  text?: string;
  completed?: boolean;
  position?: number;
}

const CHECKLIST_NAME_ERROR = 'Checklist name must contain between 1 and 160 characters';
const ITEM_TEXT_ERROR = 'Checklist item text must contain between 1 and 500 characters';
const ITEM_POSITION_ERROR = 'Checklist item position must be within the project checklist';
const EMPTY_ITEM_CHANGES_ERROR = 'At least one checklist item field must be provided';

function normalizeRequiredText(value: string, errorMessage: string, maximumLength: number): string {
  if (typeof value !== 'string') throw new InvalidValueException(errorMessage);
  const normalized = value.trim();
  if (normalized.length === 0 || normalized.length > maximumLength) {
    throw new InvalidValueException(errorMessage);
  }
  return normalized;
}

function validateIdentity(id: unknown): asserts id is string {
  if (typeof id !== 'string' || id.trim().length === 0) {
    throw new InvalidValueException('Project checklist and item IDs are required');
  }
}

function normalizeItems(items: ProjectChecklistItem[]): ProjectChecklistItem[] {
  if (!Array.isArray(items)) throw new InvalidValueException('Project checklist items must be an array');
  const normalized = items.map((item) => {
    validateIdentity(item?.id);
    if (!Number.isInteger(item.position) || item.position < 0) {
      throw new InvalidValueException(ITEM_POSITION_ERROR);
    }
    if (typeof item.completed !== 'boolean') {
      throw new InvalidValueException('Checklist item completion must be a boolean');
    }
    return {
      id: item.id,
      text: normalizeRequiredText(item.text, ITEM_TEXT_ERROR, 500),
      position: item.position,
      completed: item.completed,
    };
  }).sort((left, right) => left.position - right.position);
  const ids = new Set(normalized.map((item) => item.id));
  if (ids.size !== normalized.length) {
    throw new InvalidValueException('Project checklist item IDs must be unique');
  }
  if (normalized.some((item, index) => item.position !== index)) {
    throw new InvalidValueException(ITEM_POSITION_ERROR);
  }
  return normalized;
}

function copyItem(item: ProjectChecklistItem): ProjectChecklistItem {
  return { ...item };
}

export class ProjectChecklist {
  private readonly projectId_: string;
  private readonly sourceTemplateId_: string | null;
  private readonly name_: string;
  private items_: ProjectChecklistItem[];

  private constructor(primitives: ProjectChecklistPrimitives) {
    this.projectId_ = primitives.projectId;
    this.sourceTemplateId_ = primitives.sourceTemplateId;
    this.name_ = primitives.name;
    this.items_ = primitives.items;
  }

  static create(primitives: ProjectChecklistPrimitives): ProjectChecklist {
    validateIdentity(primitives.projectId);
    if (primitives.sourceTemplateId !== null) validateIdentity(primitives.sourceTemplateId);
    return new ProjectChecklist({
      projectId: primitives.projectId,
      sourceTemplateId: primitives.sourceTemplateId,
      name: normalizeRequiredText(primitives.name, CHECKLIST_NAME_ERROR, 160),
      items: normalizeItems(primitives.items),
    });
  }

  static rehydrate(primitives: ProjectChecklistPrimitives): ProjectChecklist {
    return ProjectChecklist.create(primitives);
  }

  static normalizeItemText(text: string): string {
    return normalizeRequiredText(text, ITEM_TEXT_ERROR, 500);
  }

  withChanges(changes: ProjectChecklistChanges): ProjectChecklist {
    return ProjectChecklist.create({
      projectId: this.projectId_,
      sourceTemplateId: this.sourceTemplateId_,
      name: changes.name ?? this.name_,
      items: changes.items ?? this.items_,
    });
  }

  addItem(id: string, text: string): ProjectChecklistItem {
    validateIdentity(id);
    if (this.items_.some((item) => item.id === id)) {
      throw new InvalidValueException('Project checklist item IDs must be unique');
    }
    const item = {
      id,
      text: ProjectChecklist.normalizeItemText(text),
      position: this.items_.length,
      completed: false,
    };
    const updatedChecklist = ProjectChecklist.create({
      projectId: this.projectId_,
      sourceTemplateId: this.sourceTemplateId_,
      name: this.name_,
      items: [...this.items_, item],
    });
    this.items_ = updatedChecklist.items_;
    return copyItem(item);
  }

  updateItem(itemId: string, changes: ProjectChecklistItemChanges): ProjectChecklistItemChanges {
    const current = this.findItem(itemId);
    if (changes.text === undefined && changes.completed === undefined && changes.position === undefined) {
      throw new InvalidValueException(EMPTY_ITEM_CHANGES_ERROR);
    }

    const normalizedChanges: ProjectChecklistItemChanges = {};
    if (changes.text !== undefined) {
      normalizedChanges.text = normalizeRequiredText(changes.text, ITEM_TEXT_ERROR, 500);
    }
    if (changes.completed !== undefined) {
      if (typeof changes.completed !== 'boolean') {
        throw new InvalidValueException('Checklist item completion must be a boolean');
      }
      normalizedChanges.completed = changes.completed;
    }
    if (changes.position !== undefined) {
      if (!Number.isInteger(changes.position) || changes.position < 0 || changes.position >= this.items_.length) {
        throw new InvalidValueException(ITEM_POSITION_ERROR);
      }
      normalizedChanges.position = changes.position;
    }

    let updatedItems = this.items_.map((item) => ({
      ...item,
      ...(normalizedChanges.text !== undefined && item.id === itemId ? { text: normalizedChanges.text } : {}),
      ...(normalizedChanges.completed !== undefined && item.id === itemId
        ? { completed: normalizedChanges.completed }
        : {}),
    }));
    if (normalizedChanges.position !== undefined && normalizedChanges.position !== current.position) {
      const movedItem = updatedItems.splice(current.position, 1)[0];
      if (movedItem === undefined) throw new EntityNotFoundException('Project checklist item', itemId);
      updatedItems.splice(normalizedChanges.position, 0, movedItem);
      updatedItems = updatedItems.map((item, position) => ({ ...item, position }));
    }

    const updatedChecklist = ProjectChecklist.create({
      projectId: this.projectId_,
      sourceTemplateId: this.sourceTemplateId_,
      name: this.name_,
      items: updatedItems,
    });
    this.items_ = updatedChecklist.items_;
    return normalizedChanges;
  }

  removeItem(itemId: string): void {
    this.findItem(itemId);
    const remainingItems = this.items_.filter((item) => item.id !== itemId)
      .map((item, position) => ({ ...item, position }));
    const updatedChecklist = ProjectChecklist.create({
      projectId: this.projectId_,
      sourceTemplateId: this.sourceTemplateId_,
      name: this.name_,
      items: remainingItems,
    });
    this.items_ = updatedChecklist.items_;
  }

  get projectId(): string {
    return this.projectId_;
  }

  get sourceTemplateId(): string | null {
    return this.sourceTemplateId_;
  }

  get name(): string {
    return this.name_;
  }

  get items(): ProjectChecklistItem[] {
    return this.items_.map(copyItem);
  }

  toPrimitives(): ProjectChecklistPrimitives {
    return {
      projectId: this.projectId_,
      sourceTemplateId: this.sourceTemplateId_,
      name: this.name_,
      items: this.items,
    };
  }

  private findItem(itemId: string): ProjectChecklistItem {
    const item = this.items_.find((candidate) => candidate.id === itemId);
    if (item === undefined) throw new EntityNotFoundException('Project checklist item', itemId);
    return item;
  }
}
