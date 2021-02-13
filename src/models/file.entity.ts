import { BaseEntity, Column, Entity, JoinColumn, ManyToMany, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { ElementEntity } from "./element.entity";
import { Tag } from "./tag.entity";
import { User } from "./user.entity";

@Entity()
export class File extends ElementEntity {
  @Column()
  mime: string;

  @Column()
  path: string;

  @Column()
  size: number;

  @ManyToMany(() => Tag)
  @JoinColumn()
  tags: Tag[];
}