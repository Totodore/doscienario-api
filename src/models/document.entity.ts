import { BaseEntity, Column, CreateDateColumn, Entity, JoinColumn, JoinTable, ManyToMany, ManyToOne, OneToMany, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Project } from "./project.entity";
import { User } from "./user.entity";
import { Image } from "./image.entity";
import { Tag } from "./tag.entity";
import { AppEntity } from "./app.entity";
import { Exclude } from "class-transformer";
import { DataType } from "./data-type.entity";

@Entity()
export class Document extends AppEntity {

  @PrimaryGeneratedColumn()
  id: number;

  @Column("text", { select: false, nullable: true })
  content: string;

  @Column({ default: 'Nouveau document'})
  title: string

  @CreateDateColumn()
  createdDate: Date;

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

  @UpdateDateColumn()
  lastEditing: Date;

  readonly type = DataType.Document;
}