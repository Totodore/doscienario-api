import { BaseEntity, Column, Entity, JoinColumn, JoinTable, ManyToMany, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { Node } from "./node.entity";
import { Tag } from "./tag.entity";
import { User } from "./user.entity";
import { Project } from "./project.entity";

@Entity()
export class Blueprint extends BaseEntity {

  @PrimaryGeneratedColumn()
  id: number;

  @Column({ default: 'Nouvel arbre'})
  name: string;

  @OneToMany(() => Node, node => node.blueprint)
  @JoinColumn()
  nodes: Node[];

  @Column("datetime", { default: () => "CURRENT_TIMESTAMP" })
  createdDate: Date;

  @ManyToOne(() => Project, { cascade: ["insert", "recover", "update"] })
  @JoinColumn()
  project: Project;

  @ManyToOne(() => User, { cascade: true })
  createdBy: User;

  @ManyToMany(() => Tag, tag => tag.blueprints, { cascade: ["insert", "recover", "update"] })
  @JoinTable({
    name: "blueprint-tag",
    joinColumn: {
      name: "blueprintId", referencedColumnName: "id"
    },
    inverseJoinColumn: {
      name: "tagId", referencedColumnName: "id"
    },
  })
  tags: Tag[];

  @ManyToOne(() => User, { cascade: true })
  lastEditor: User;

  @Column("timestamp", { default: () => "CURRENT_TIMESTAMP"})
  lastEditing: Date
}