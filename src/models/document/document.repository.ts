import { CustomRepository } from "@src/config/database/typeorm-ex.decorators";
import { ElementRepository } from "../element/element.repository";
import { Sheet } from "../sheet/sheet.entity";
import { Document } from "./document.entity";

@CustomRepository(Document)
export class DocumentRepository extends ElementRepository<Document> {

  public async getOne(id: number) {
    return super.getOne(id, ["createdBy", "lastEditor", "tags", "sheets"], [
      "content",
      "id",
      "createdBy",
      "createdDate",
      "lastEditing",
      'lastEditor',
      'title',
      "color"
    ]);
  }

  public async removeById(id: number) {
    await Sheet.delete({ documentId: id });
    return await super.removeById(id);
  }
}