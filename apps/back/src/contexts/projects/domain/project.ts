import { InvalidValueException } from '../../../shared/domain/invalid-value.exception';
import { PROJECT_TYPES, ProjectType } from './project-type';
import { PROJECT_STATUSES, ProjectStatus } from './project-status';
import { PROJECT_CURRENCIES, ProjectCurrency } from './project-currency';
import { PROJECT_COLORS, ProjectColor } from './project-color';

export type { ProjectType, ProjectStatus, ProjectCurrency, ProjectColor };

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function assertValidType(type: ProjectType): void {
  if (!PROJECT_TYPES.includes(type)) {
    throw new InvalidValueException(`Invalid project type: ${type}`);
  }
}

function assertValidStatus(status: ProjectStatus): void {
  if (!PROJECT_STATUSES.includes(status)) {
    throw new InvalidValueException(`Invalid project status: ${status}`);
  }
}

function assertValidCurrency(currency: ProjectCurrency): void {
  if (!PROJECT_CURRENCIES.includes(currency)) {
    throw new InvalidValueException(`Invalid project currency: ${currency}`);
  }
}

function assertValidColor(color: ProjectColor | null): void {
  if (color !== null && !PROJECT_COLORS.includes(color)) {
    throw new InvalidValueException(`Invalid project color: ${color}`);
  }
}

function assertValidDate(date: string | null, field: string): void {
  if (date !== null && !DATE_PATTERN.test(date)) {
    throw new InvalidValueException(`${field} must match the format YYYY-MM-DD`);
  }
}

function assertValidBudget(budget: number | null): void {
  if (budget !== null && budget < 0) {
    throw new InvalidValueException('budget must be greater than or equal to 0');
  }
}

function assertValidClientId(clientId: string): void {
  if (typeof clientId !== 'string' || clientId.length === 0) {
    throw new InvalidValueException('clientId is required');
  }
}

export interface ProjectPrimitives {
  id: string;
  name: string;
  code: string;
  type: ProjectType;
  status: ProjectStatus;
  description: string | null;
  clientId: string;
  address: string | null;
  startDate: string | null;
  endDate: string | null;
  budget: number | null;
  currency: ProjectCurrency;
  manager: string | null;
  image: string | null;
  color: ProjectColor | null;
  planningEnabled?: boolean;
}

interface ProjectProps {
  id: string;
  name: string;
  code: string;
  type: ProjectType;
  status: ProjectStatus;
  description: string | null;
  clientId: string;
  address: string | null;
  startDate: string | null;
  endDate: string | null;
  budget: number | null;
  currency: ProjectCurrency;
  manager: string | null;
  image: string | null;
  color: ProjectColor | null;
  planningEnabled: boolean;
}

export class Project {
  private readonly id_: string;
  private name_: string;
  private code_: string;
  private type_: ProjectType;
  private status_: ProjectStatus;
  private description_: string | null;
  private clientId_: string;
  private address_: string | null;
  private startDate_: string | null;
  private endDate_: string | null;
  private budget_: number | null;
  private currency_: ProjectCurrency;
  private manager_: string | null;
  private image_: string | null;
  private color_: ProjectColor | null;
  private planningEnabled_: boolean;

  private constructor(props: ProjectProps) {
    this.id_ = props.id;
    this.name_ = props.name;
    this.code_ = props.code;
    this.type_ = props.type;
    this.status_ = props.status;
    this.description_ = props.description;
    this.clientId_ = props.clientId;
    this.address_ = props.address;
    this.startDate_ = props.startDate;
    this.endDate_ = props.endDate;
    this.budget_ = props.budget;
    this.currency_ = props.currency;
    this.manager_ = props.manager;
    this.image_ = props.image;
    this.color_ = props.color;
    this.planningEnabled_ = props.planningEnabled;
  }

  static create(params: ProjectPrimitives): Project {
    assertValidType(params.type);
    assertValidStatus(params.status);
    assertValidCurrency(params.currency);
    assertValidClientId(params.clientId);
    assertValidDate(params.startDate, 'startDate');
    assertValidDate(params.endDate, 'endDate');
    assertValidBudget(params.budget);
    assertValidColor(params.color);

    return new Project({
      id: params.id,
      name: params.name,
      code: params.code,
      type: params.type,
      status: params.status,
      description: params.description,
      clientId: params.clientId,
      address: params.address,
      startDate: params.startDate,
      endDate: params.endDate,
      budget: params.budget,
      currency: params.currency,
      manager: params.manager,
      image: params.image,
      color: params.color,
      planningEnabled: params.planningEnabled ?? false,
    });
  }

  rename(name: string): void {
    this.name_ = name;
  }

  changeCode(code: string): void {
    this.code_ = code;
  }

  changeType(type: ProjectType): void {
    assertValidType(type);
    this.type_ = type;
  }

  changeStatus(status: ProjectStatus): void {
    assertValidStatus(status);
    this.status_ = status;
  }

  changeDescription(description: string | null): void {
    this.description_ = description;
  }

  changeClientId(clientId: string): void {
    assertValidClientId(clientId);
    this.clientId_ = clientId;
  }

  changeAddress(address: string | null): void {
    this.address_ = address;
  }

  changeStartDate(startDate: string | null): void {
    assertValidDate(startDate, 'startDate');
    this.startDate_ = startDate;
  }

  changeEndDate(endDate: string | null): void {
    assertValidDate(endDate, 'endDate');
    this.endDate_ = endDate;
  }

  changeBudget(budget: number | null): void {
    assertValidBudget(budget);
    this.budget_ = budget;
  }

  changeCurrency(currency: ProjectCurrency): void {
    assertValidCurrency(currency);
    this.currency_ = currency;
  }

  changeManager(manager: string | null): void {
    this.manager_ = manager;
  }

  changeImage(image: string | null): void {
    this.image_ = image;
  }

  changeColor(color: ProjectColor | null): void {
    assertValidColor(color);
    this.color_ = color;
  }

  changePlanningEnabled(enabled: boolean): void {
    this.planningEnabled_ = enabled;
  }

  get id(): string {
    return this.id_;
  }

  get name(): string {
    return this.name_;
  }

  get code(): string {
    return this.code_;
  }

  get type(): ProjectType {
    return this.type_;
  }

  get status(): ProjectStatus {
    return this.status_;
  }

  get description(): string | null {
    return this.description_;
  }

  get clientId(): string {
    return this.clientId_;
  }

  get address(): string | null {
    return this.address_;
  }

  get startDate(): string | null {
    return this.startDate_;
  }

  get endDate(): string | null {
    return this.endDate_;
  }

  get budget(): number | null {
    return this.budget_;
  }

  get currency(): ProjectCurrency {
    return this.currency_;
  }

  get manager(): string | null {
    return this.manager_;
  }

  get image(): string | null {
    return this.image_;
  }

  get color(): ProjectColor | null {
    return this.color_;
  }

  get planningEnabled(): boolean {
    return this.planningEnabled_;
  }

  toPrimitives(): ProjectPrimitives {
    return {
      id: this.id_,
      name: this.name_,
      code: this.code_,
      type: this.type_,
      status: this.status_,
      description: this.description_,
      clientId: this.clientId_,
      address: this.address_,
      startDate: this.startDate_,
      endDate: this.endDate_,
      budget: this.budget_,
      currency: this.currency_,
      manager: this.manager_,
      image: this.image_,
      color: this.color_,
      planningEnabled: this.planningEnabled_,
    };
  }
}
