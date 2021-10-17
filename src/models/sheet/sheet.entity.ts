import { Column, Entity, ManyToOne, OneToMany, RelationId } from "typeorm";
import { DataType } from "../data-type.entity";
import { Document } from "../document/document.entity";
import { ContentElementEntity, ElementEntity, IElementEntity } from "../element/element.entity";

@Entity()
export class Sheet extends ContentElementEntity implements IElementEntity {

  @ManyToOne(() => Document, doc => doc.sheets)
  public document: Document;

  @RelationId((sheet: Sheet) => sheet.document)
  public documentId: number;

  readonly type = DataType.Sheet;

}