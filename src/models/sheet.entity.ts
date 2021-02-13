import { BaseEntity, Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { ElementEntity } from "./element.entity";
import { Tag } from "./tag.entity";
import { User } from "./user.entity";

@Entity()
export class Sheet extends ElementEntity {

  @PrimaryGeneratedColumn()
  id: number;

  @Column("text")
  content: string;

  @OneToMany(() => Tag, tag => tag.project)
  @JoinColumn()
  tags: Tag[];
}