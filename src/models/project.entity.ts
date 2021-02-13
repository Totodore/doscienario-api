import { BaseEntity, Column, Entity, JoinColumn, ManyToMany, ManyToOne, OneToMany, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { User } from "./user.entity";
import { Document } from "./document.entity";
import { Blueprint } from "./blueprint.entity";
import { Tag } from "./tag.entity";
import { AppEntity } from "./app.entity";
import { File } from "./file.entity";

@Entity()
export class Project extends AppEntity {

  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column('timestamp', { default: () => "CURRENT_TIMESTAMP" })
  createdDate: Date;

  @ManyToMany(() => User)
  @JoinColumn()
  users: User[];

  @ManyToOne(() => User)
  @JoinColumn()
  createdBy: User;

  @OneToMany(() => Document, document => document.project)
  @JoinColumn()
  documents: Document[];

  @OneToMany(() => Blueprint, blueprint => blueprint.project)
  @JoinColumn()
  blueprints: Blueprint[];

  @OneToMany(() => Tag, tag => tag.project)
  @JoinColumn()
  tags: Tag[];

  @OneToMany(() => File, file => file.project)
  @JoinColumn()
  files: File[];
}