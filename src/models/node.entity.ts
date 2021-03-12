import { BaseEntity, Column, Entity, JoinColumn, ManyToMany, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { Blueprint } from "./blueprint.entity";
import { ElementEntity } from "./element.entity";
import { Relationship } from "./relationship.entity";
import { Tag } from "./tag.entity";

@Entity()
export class Node extends ElementEntity {

  @PrimaryGeneratedColumn()
  id: number;
  
  @Column({ default: false })
  isRoot: boolean;

  @Column("text")
  content: string;

  @Column({ nullable: true })
  title: string;

  @Column()
  blueprintId: number;

  @ManyToOne(() => Blueprint)
  blueprint: Blueprint;

  @OneToMany(() => Relationship, relationship => relationship.childId)
  @JoinColumn()
  parentsRelations: Relationship[];

  @OneToMany(() => Relationship, relationship => relationship.parentId)
  @JoinColumn()
  childsRelations: Relationship[];

  @ManyToMany(() => Tag)
  @JoinColumn()
  tags: Tag[];
}