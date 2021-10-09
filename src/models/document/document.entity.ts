import { Column, Entity, JoinColumn, JoinTable, ManyToMany, ManyToOne, UpdateDateColumn } from "typeorm";
import { Tag } from "../tag/tag.entity";
import { DataType } from "../data-type.entity";
import { ElementEntity, IElementEntity } from "../element/element.entity";

@Entity()
export class Document extends ElementEntity implements IElementEntity {

  @Column("text", { select: false, nullable: true })
  content: string;

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

  readonly type = DataType.Document;
}