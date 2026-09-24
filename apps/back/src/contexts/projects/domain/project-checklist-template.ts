import { InvalidValueException } from '../../../shared/domain/invalid-value.exception';

export interface ProjectChecklistTemplateItem {
  id: string;
  text: string;
  position: number;
}

export interface ProjectChecklistTemplatePrimitives {
  id: string;
  name: string;
  items: ProjectChecklistTemplateItem[];
}

export interface ProjectChecklistTemplateChanges {
  name?: string;
  items?: ProjectChecklistTemplateItem[];
}

const TEMPLATE_NAME_ERROR = 'Checklist template name must contain between 1 and 160 characters';
const ITEM_TEXT_ERROR = 'Checklist item text must contain between 1 and 500 characters';

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
    throw new InvalidValueException('Checklist template and item IDs are required');
  }
}

function normalizeItems(items: ProjectChecklistTemplateItem[]): ProjectChecklistTemplateItem[] {
  if (!Array.isArray(items)) throw new InvalidValueException('Checklist template items must be an array');
  const normalized = items.map((item) => {
    validateIdentity(item?.id);
    if (!Number.isInteger(item.position) || item.position < 0) {
      throw new InvalidValueException('Checklist template item positions must be consecutive non-negative integers');
    }
    return {
      id: item.id,
      text: normalizeRequiredText(item.text, ITEM_TEXT_ERROR, 500),
      position: item.position,
    };
  }).sort((left, right) => left.position - right.position);
  const ids = new Set(normalized.map((item) => item.id));
  if (ids.size !== normalized.length) {
    throw new InvalidValueException('Checklist template item IDs must be unique');
  }
  if (normalized.some((item, index) => item.position !== index)) {
    throw new InvalidValueException('Checklist template item positions must be consecutive non-negative integers');
  }
  return normalized;
}

export class ProjectChecklistTemplate {
  private readonly id_: string;
  private readonly name_: string;
  private readonly items_: ProjectChecklistTemplateItem[];

  private constructor(primitives: ProjectChecklistTemplatePrimitives) {
    this.id_ = primitives.id;
    this.name_ = primitives.name;
    this.items_ = primitives.items;
  }

  static create(primitives: ProjectChecklistTemplatePrimitives): ProjectChecklistTemplate {
    validateIdentity(primitives.id);
    const name = normalizeRequiredText(primitives.name, TEMPLATE_NAME_ERROR, 160);
    return new ProjectChecklistTemplate({
      id: primitives.id,
      name,
      items: normalizeItems(primitives.items),
    });
  }

  static rehydrate(primitives: ProjectChecklistTemplatePrimitives): ProjectChecklistTemplate {
    return ProjectChecklistTemplate.create(primitives);
  }

  withChanges(changes: ProjectChecklistTemplateChanges): ProjectChecklistTemplate {
    return ProjectChecklistTemplate.create({
      id: this.id_,
      name: changes.name ?? this.name_,
      items: changes.items ?? this.items_,
    });
  }

  get id(): string {
    return this.id_;
  }

  get name(): string {
    return this.name_;
  }

  get items(): ProjectChecklistTemplateItem[] {
    return this.items_.map((item) => ({ ...item }));
  }

  toPrimitives(): ProjectChecklistTemplatePrimitives {
    return { id: this.id_, name: this.name_, items: this.items };
  }
}
