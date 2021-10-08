import { EntityRepository } from "typeorm";
import { AppRepository } from "../app.repository";
import { ElementRepository } from "../element/element.repository";
import { Project } from "../project/project.entity";
import { Tag } from "../tag/tag.entity";
import { User } from "../user/user.entity";
import { Document } from "./document.entity";

@EntityRepository(Document)
export class DocumentRepository extends ElementRepository<Document> {

  public async getOne(id: number) {
    return super.getOne(id, ["createdBy", "lastEditor", "tags"], [
      "content",
      "id",
      "createdBy",
      "createdDate",
      "lastEditing",
      'lastEditor',
      'title',
      // 'tags'
    ]);
  }
}