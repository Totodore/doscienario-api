import { BaseEntity, Column, Entity, JoinColumn, ManyToOne, OneToMany, OneToOne, PrimaryGeneratedColumn, RelationId } from "typeorm";
import { Project } from "./project.entity";
import { User } from "./user.entity";
import { Document } from "./document.entity";
import { AppEntity } from "./app.entity";

@Entity()
export class Image extends AppEntity {

  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  size: number;

  @Column()
  height: number;

  @Column()
  width: number;

  @Column("timestamp", { default: () => "CURRENT_TIMESTAMP" })
  uploadedDate: Date;

  @Column("int", { nullable: true })
  documentPos: number;

  @RelationId((image: Image) => image.document)
  documentId: number;

  @ManyToOne(() => Document, { nullable: true })
  @JoinColumn()
  document: Document;

  @ManyToOne(() => User)
  @JoinColumn()
  addedBy: User;
}