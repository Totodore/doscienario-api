import { Project } from "src/models/project.entity";
import { User } from "src/models/user.entity";

export class UserRes {

  name: string;
  id: string;

  constructor(
    user: User
  ) {
    this.name = user.name;
    this.id = user.id;
  }
}