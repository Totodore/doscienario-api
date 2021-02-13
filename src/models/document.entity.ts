import { BaseEntity, Column, Entity, JoinColumn, ManyToMany, OneToMany, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { Project } from "./project.entity";
import { User } from "./user.entity";
import { Image } from "./image.entity";
import { Tag } from "./tag.entity";

export enum DocumentTypes {
  HISTORY = "HISTORY",
  CHARACTERS = "CHARACTERS",
  PLACES = "PLACES",
  OTHERS = "OTHERS"
}

@Entity()
export class Document extends BaseEntity {

  @PrimaryGeneratedColumn()
  id: number;

  @Column("text")
  content: string;

  @Column("datetime")
  createdDate: Date;

  @Column("enum", { enum: DocumentTypes })
  type: DocumentTypes;

  @OneToOne(() => Project)
  @JoinColumn()
  project: Project;

  @OneToOne(() => User)
  @JoinColumn()
  createdBy: User;

  @OneToMany(() => Image, image => image.document, { nullable: true })
  @JoinColumn()
  images: Image[];

  @ManyToMany(() => Tag)
  @JoinColumn()
  tags: Tag[];
}