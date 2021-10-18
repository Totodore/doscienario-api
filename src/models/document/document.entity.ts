import { Entity, JoinColumn, JoinTable, ManyToMany, ManyToOne, OneToMany } from "typeorm";
import { Tag } from "../tag/tag.entity";
import { DataType } from "../data-type.entity";
import { ContentElementEntity, IElementEntity } from "../element/element.entity";
import { Sheet } from "../sheet/sheet.entity";

@Entity()
export class Document extends ContentElementEntity implements IElementEntity {

  @ManyToMany(() => Tag, tag => tag.documents, { cascade: ["insert", "recover", "update"] })
  @JoinTable({
    name: "document-tag",
    joinColumn: {
      name: "documentId", referencedColumnName: "id"
    },
    inverseJoinColumn: {
      name: "tagId", referencedColumnName: "id"
    },
  })
  tags: Tag[];

  @OneToMany(() => Sheet, sheet => sheet.document, { cascade: ["insert", "recover", "update", "remove"] })
  public sheets: Sheet[];

  readonly type = DataType.Document;
}