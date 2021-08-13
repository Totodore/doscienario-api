import { BaseEntity, Column, CreateDateColumn, Entity, JoinColumn, JoinTable, ManyToMany, ManyToOne, OneToMany, PrimaryGeneratedColumn, RelationId, UpdateDateColumn } from "typeorm";
import { Blueprint } from "./blueprint.entity";
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

  @CreateDateColumn()
  createdDate: Date;

  @ManyToOne(() => User, { cascade: true })
  createdBy: User;

  @ManyToOne(() => User, { cascade: true })
  lastEditor: User;

  @UpdateDateColumn()
  lastEditing: Date
  
  @Column({ default: false })
  isRoot: boolean;

  @Column("text", { nullable: true })
  content: string;

  @Column({ default: () => "false" })
  locked: boolean;

  @Column("text", { nullable: true })
  summary: string;

  @ManyToOne(() => Blueprint)
  blueprint: Blueprint;

  @RelationId((node: Node) => node.blueprint)
  blueprintId: number;

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