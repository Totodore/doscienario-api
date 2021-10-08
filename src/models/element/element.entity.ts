import { AppEntity } from "../app.entity";
import { DataType } from "../data-type.entity";
import { Project } from "../project/project.entity";
import { Tag } from "../tag/tag.entity";
import { User } from "../user/user.entity";

export interface ElementEntity extends AppEntity {
  id: number;
  title: string;
  tags: Tag[];
  createdDate: Date;
  project: Project;
  createdBy: User;
  lastEditor: User;
  lastEditing: Date;
  type: DataType;
}