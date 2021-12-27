import { EntityRepository } from "typeorm";
import { ElementRepository } from "../element/element.repository";
import { Sheet } from "./sheet.entity";

@EntityRepository(Sheet)
export class SheetRepository extends ElementRepository<Sheet> {
  
  public updateContent(id: number, content: string) {
    return super.update(id, { content });
  }
  
  public async getOne(id: number) {
    return super.getOne(id, ["createdBy", "lastEditor"], [
      "content",
      "id",
      "title",
      "documentId",
      "createdBy",
      "createdDate",
      "lastEditing",
      'lastEditor',
    ]);
  }
}