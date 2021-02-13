import { Project } from "src/models/project.entity";
import { User } from "src/models/user.entity";

export class UserRes {

  projects: UserProjectsRes[];
  name: string;
  id: string;

  constructor(
    user: User
  ) {
    this.name = user.name;
    this.id = user.id;
    this.projects = user.projects?.map(el => new UserProjectsRes(el));
  }
}

export class UserProjectsRes {

  createdDate: number;
  name: string;

  constructor(project: Project) {
    this.createdDate = project.createdDate.getTime();
    this.name = project.name.toString();
  }
}