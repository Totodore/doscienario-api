import { BaseEntity, Column, Entity, JoinColumn, ManyToMany, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { Node } from "./node.entity";
import { Tag } from "./tag.entity";
import { ElementEntity } from "./element.entity";

@Entity()
export class Blueprint extends ElementEntity {

  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @OneToMany(() => Node, node => node.blueprint)
  @JoinColumn()
  nodes: Node[];

  @ManyToMany(() => Tag)
  @JoinColumn()
  tags: Tag[];
}