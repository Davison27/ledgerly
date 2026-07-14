export interface ProjectPrimitives {
  id: string;
  name: string;
  code: string;
}

export class Project {
  private constructor(
    private readonly id_: string,
    private name_: string,
    private code_: string,
  ) {}

  static create(params: ProjectPrimitives): Project {
    return new Project(params.id, params.name, params.code);
  }

  rename(name: string): void {
    this.name_ = name;
  }

  changeCode(code: string): void {
    this.code_ = code;
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

  toPrimitives(): ProjectPrimitives {
    return {
      id: this.id_,
      name: this.name_,
      code: this.code_,
    };
  }
}
