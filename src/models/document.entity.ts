import { BaseEntity, Column, Entity, JoinColumn, JoinTable, ManyToMany, ManyToOne, OneToMany, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { Project } from "./project.entity";
import { User } from "./user.entity";
import { Image } from "./image.entity";
import { Tag } from "./tag.entity";
import { AppEntity } from "./app.entity";
import { Exclude } from "class-transformer";

export enum DocumentTypes {
  HISTORY = "HISTORY",
  CHARACTERS = "CHARACTERS",
  PLACES = "PLACES",
  OTHERS = "OTHERS"
}

@Entity()
export class Document extends AppEntity {

  @PrimaryGeneratedColumn()
  id: number;

  @Column("text", { select: false, nullable: true })
  content: string;

  @Column({ default: 'Nouveau document'})
  title: string
  
  @Column("datetime", { default: () => "CURRENT_TIMESTAMP" })
  createdDate: Date;

  @Column("enum", { enum: DocumentTypes })
  type: DocumentTypes;

  @ManyToOne(() => Project, { cascade: ["insert", "recover", "update"] })
  @JoinColumn()
  project: Project;

  @ManyToOne(() => User, { cascade: true })
  createdBy: User;

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

  @ManyToOne(() => User, { cascade: true })
  lastEditor: User;

  @Column("timestamp", { default: () => "CURRENT_TIMESTAMP"})
  lastEditing: Date
}