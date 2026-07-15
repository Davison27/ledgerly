import { InvalidValueException } from '../../../shared/domain/invalid-value.exception';
import { Email } from './value-objects/email';
import { PROJECT_TYPES, ProjectType } from './project-type';
import { PROJECT_STATUSES, ProjectStatus } from './project-status';
import { PROJECT_CURRENCIES, ProjectCurrency } from './project-currency';

export type { ProjectType, ProjectStatus, ProjectCurrency };

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

export interface ProjectPrimitives {
  id: string;
  name: string;
  code: string;
  type: ProjectType;
  status: ProjectStatus;
  description: string | null;
  clientCompany: string | null;
  clientTaxId: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  address: string | null;
  startDate: string | null;
  endDate: string | null;
  budget: number | null;
  currency: ProjectCurrency;
  fiscalYear: string | null;
  manager: string | null;
}

interface ProjectProps {
  id: string;
  name: string;
  code: string;
  type: ProjectType;
  status: ProjectStatus;
  description: string | null;
  clientCompany: string | null;
  clientTaxId: string | null;
  contactName: string | null;
  contactEmail: Email | null;
  contactPhone: string | null;
  address: string | null;
  startDate: string | null;
  endDate: string | null;
  budget: number | null;
  currency: ProjectCurrency;
  fiscalYear: string | null;
  manager: string | null;
}

export class Project {
  private readonly id_: string;
  private name_: string;
  private code_: string;
  private type_: ProjectType;
  private status_: ProjectStatus;
  private description_: string | null;
  private clientCompany_: string | null;
  private clientTaxId_: string | null;
  private contactName_: string | null;
  private contactEmail_: Email | null;
  private contactPhone_: string | null;
  private address_: string | null;
  private startDate_: string | null;
  private endDate_: string | null;
  private budget_: number | null;
  private currency_: ProjectCurrency;
  private fiscalYear_: string | null;
  private manager_: string | null;

  private constructor(props: ProjectProps) {
    this.id_ = props.id;
    this.name_ = props.name;
    this.code_ = props.code;
    this.type_ = props.type;
    this.status_ = props.status;
    this.description_ = props.description;
    this.clientCompany_ = props.clientCompany;
    this.clientTaxId_ = props.clientTaxId;
    this.contactName_ = props.contactName;
    this.contactEmail_ = props.contactEmail;
    this.contactPhone_ = props.contactPhone;
    this.address_ = props.address;
    this.startDate_ = props.startDate;
    this.endDate_ = props.endDate;
    this.budget_ = props.budget;
    this.currency_ = props.currency;
    this.fiscalYear_ = props.fiscalYear;
    this.manager_ = props.manager;
  }

  static create(params: ProjectPrimitives): Project {
    assertValidType(params.type);
    assertValidStatus(params.status);
    assertValidCurrency(params.currency);
    assertValidDate(params.startDate, 'startDate');
    assertValidDate(params.endDate, 'endDate');
    assertValidBudget(params.budget);

    const contactEmail =
      params.contactEmail !== null ? Email.create(params.contactEmail) : null;

    return new Project({
      id: params.id,
      name: params.name,
      code: params.code,
      type: params.type,
      status: params.status,
      description: params.description,
      clientCompany: params.clientCompany,
      clientTaxId: params.clientTaxId,
      contactName: params.contactName,
      contactEmail,
      contactPhone: params.contactPhone,
      address: params.address,
      startDate: params.startDate,
      endDate: params.endDate,
      budget: params.budget,
      currency: params.currency,
      fiscalYear: params.fiscalYear,
      manager: params.manager,
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

  changeClientCompany(clientCompany: string | null): void {
    this.clientCompany_ = clientCompany;
  }

  changeClientTaxId(clientTaxId: string | null): void {
    this.clientTaxId_ = clientTaxId;
  }

  changeContactName(contactName: string | null): void {
    this.contactName_ = contactName;
  }

  changeContactEmail(contactEmail: string | null): void {
    this.contactEmail_ = contactEmail !== null ? Email.create(contactEmail) : null;
  }

  changeContactPhone(contactPhone: string | null): void {
    this.contactPhone_ = contactPhone;
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

  changeFiscalYear(fiscalYear: string | null): void {
    this.fiscalYear_ = fiscalYear;
  }

  changeManager(manager: string | null): void {
    this.manager_ = manager;
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

  get clientCompany(): string | null {
    return this.clientCompany_;
  }

  get clientTaxId(): string | null {
    return this.clientTaxId_;
  }

  get contactName(): string | null {
    return this.contactName_;
  }

  get contactEmail(): string | null {
    return this.contactEmail_ !== null ? this.contactEmail_.toValue() : null;
  }

  get contactPhone(): string | null {
    return this.contactPhone_;
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

  get fiscalYear(): string | null {
    return this.fiscalYear_;
  }

  get manager(): string | null {
    return this.manager_;
  }

  toPrimitives(): ProjectPrimitives {
    return {
      id: this.id_,
      name: this.name_,
      code: this.code_,
      type: this.type_,
      status: this.status_,
      description: this.description_,
      clientCompany: this.clientCompany_,
      clientTaxId: this.clientTaxId_,
      contactName: this.contactName_,
      contactEmail: this.contactEmail,
      contactPhone: this.contactPhone_,
      address: this.address_,
      startDate: this.startDate_,
      endDate: this.endDate_,
      budget: this.budget_,
      currency: this.currency_,
      fiscalYear: this.fiscalYear_,
      manager: this.manager_,
    };
  }
}
