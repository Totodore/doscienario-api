import { BaseEntity, Column, Entity, JoinColumn, ManyToMany, ManyToOne, OneToMany, OneToOne, PrimaryGeneratedColumn } from "typeorm";
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

  @Column("text", { select: false })
  content: string;

  @Column("datetime")
  createdDate: Date;

  @Column("enum", { enum: DocumentTypes })
  type: DocumentTypes;

  @OneToOne(() => Project)
  @JoinColumn()
  project: Project;

  @OneToOne(() => User)
  createdBy: User;

  @OneToMany(() => Image, image => image.document, { nullable: true })
  @JoinColumn()
  images: Image[];

  @ManyToMany(() => Tag)
  @JoinColumn()
  tags: Tag[];

  @ManyToOne(() => User)
  lastEditor: User;

  @Column("timestamp", { default: () => "CURRENT_TIMESTAMP"})
  lastEditing: Date
}