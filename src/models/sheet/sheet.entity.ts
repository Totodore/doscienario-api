import { Column, Entity, JoinColumn, ManyToOne, OneToMany, RelationId } from "typeorm";
import { DataType } from "../data-type.entity";
import { Document } from "../document/document.entity";
import { ContentElementEntity, ElementEntity, IElementEntity } from "../element/element.entity";

@Entity()
export class Sheet extends ContentElementEntity implements IElementEntity {

  @ManyToOne(() => Document, doc => doc.sheets)
  @JoinColumn({ name: "documentId" })
  public document: Document;

  @Column()
  public documentId: number;

  readonly type = DataType.Sheet;

}