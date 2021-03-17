import { BaseEntity, Column, Entity, JoinColumn, JoinTable, ManyToMany, ManyToOne, OneToMany, PrimaryGeneratedColumn, RelationId } from "typeorm";
import { Blueprint } from "./blueprint.entity";
import { Relationship } from "./relationship.entity";
import { Tag } from "./tag.entity";
import { User } from "./user.entity";

@Entity()
export class Node extends BaseEntity {

  @PrimaryGeneratedColumn()
  id: number;

  @Column({ default: 0 })
  x: number;

  @Column({ default: 0 })
  y: number;

  @Column("datetime", { default: () => "CURRENT_TIMESTAMP" })
  createdDate: Date;

  @ManyToOne(() => User, { cascade: true })
  createdBy: User;

  @ManyToOne(() => User, { cascade: true })
  lastEditor: User;

  @Column("timestamp", { default: () => "CURRENT_TIMESTAMP"})
  lastEditing: Date
  
  @Column({ default: false })
  isRoot: boolean;

  @Column("text", { nullable: true })
  content: string;

  @Column({ nullable: true })
  title: string;

  @ManyToOne(() => Blueprint)
  blueprint: Blueprint;

  @OneToMany(() => Relationship, relationship => relationship.childId, { eager: true, cascade: true })
  @JoinColumn()
  parentsRelations: Relationship[];

  @OneToMany(() => Relationship, relationship => relationship.parentId, { eager: true, cascade: true })
  @JoinColumn()
  childsRelations: Relationship[];

  @ManyToMany(() => Tag, tag => tag.nodes, { cascade: ["insert", "recover", "update"] })
  @JoinTable({
    name: "node-tag",
    joinColumn: {
      name: "nodeId", referencedColumnName: "id"
    },
    inverseJoinColumn: {
      name: "tagId", referencedColumnName: "id"
    },
  })
  tags: Tag[];
}