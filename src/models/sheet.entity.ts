import { BaseEntity, Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { Tag } from "./tag.entity";
import { User } from "./user.entity";

@Entity()
export class Sheet extends BaseEntity {

  @PrimaryGeneratedColumn()
  id: number;

  @Column("text")
  content: string;

  @OneToMany(() => Tag, tag => tag.project)
  @JoinColumn()
  tags: Tag[];
}