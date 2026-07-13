import { Project } from '../../domain/project';
import { ProjectOrmEntity } from './project.orm-entity';

export class ProjectMapper {
  toDomain(orm: ProjectOrmEntity): Project {
    return Project.create({
      id: orm.id,
      name: orm.name,
      code: orm.code,
    });
  }

  toOrm(project: Project): ProjectOrmEntity {
    const orm = new ProjectOrmEntity();
    const primitives = project.toPrimitives();

    orm.id = primitives.id;
    orm.name = primitives.name;
    orm.code = primitives.code;

    return orm;
  }
}
