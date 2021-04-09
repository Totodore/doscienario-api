import { Relationship } from './relationship.entity';
import { BaseEntity, Column, Entity, JoinColumn, JoinTable, ManyToMany, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { Node } from "./node.entity";
import { Tag } from "./tag.entity";
import { User } from "./user.entity";
import { Project } from "./project.entity";
import { AppEntity } from "./app.entity";
import { CONNREFUSED } from 'node:dns';

@Entity()
export class Blueprint extends AppEntity {

  @PrimaryGeneratedColumn()
  id: number;

  @Column({ default: 'Nouvel arbre'})
  name: string;

  @OneToMany(() => Node, node => node.blueprint, { cascade: true })
  @JoinColumn()
  nodes: Node[];

  @OneToMany(() => Relationship, rel => rel.blueprint, { cascade: true })
  @JoinColumn()
  relationships: Relationship[];

  @Column("datetime", { default: () => "CURRENT_TIMESTAMP" })
  createdDate: Date;

  @Column({ nullable: true })
  x: number;

  @Column({ nullable: true })
  y: number;

  @ManyToOne(() => Project, { cascade: ["insert", "recover", "update"] })
  @JoinColumn()
  project: Project;

  @ManyToOne(() => User, { cascade: true })
  @JoinColumn()
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
  @JoinColumn()
  lastEditor: User;

  @Column("timestamp", { default: () => "CURRENT_TIMESTAMP"})
  lastEditing: Date
}