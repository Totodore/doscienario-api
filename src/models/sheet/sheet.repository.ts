import { EntityRepository, OneToMany } from "typeorm";
import { Document } from "../document/document.entity";
import { ElementRepository } from "../element/element.repository";
import { Sheet } from "./sheet.entity";

@EntityRepository(Document)
export class SheetRepository extends ElementRepository<Sheet> {
  
  public updateContent(id: number, content: string) {
    return super.update(id, { content });
  }
  
  public async getOne(id: number) {
    return super.getOne(id, ["createdBy", "lastEditor", "tags"], [
      "content",
      "id",
      "createdBy",
      "createdDate",
      "lastEditing",
      'lastEditor',
    ]);
  }
}