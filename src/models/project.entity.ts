import { Image } from './image.entity';
import { BaseEntity, Column, CreateDateColumn, Entity, JoinColumn, JoinTable, ManyToMany, ManyToOne, OneToMany, OneToOne, PrimaryGeneratedColumn } from "typeorm";
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

  @CreateDateColumn()
  createdDate: Date;

  @ManyToMany(() => User, user => user.projects, { cascade: ["insert", "recover", "update"] })
  @JoinTable()
  users: User[];

  @ManyToOne(() => User)
  @JoinColumn()
  createdBy: User;

  @OneToMany(() => Document, document => document.project, { cascade: true })
  @JoinColumn()
  documents: Document[];

  @OneToMany(() => Image, image => image.project, { cascade: true })
  @JoinColumn()
  images: Image[];

  @OneToMany(() => Blueprint, blueprint => blueprint.project, { cascade: true })
  @JoinColumn()
  blueprints: Blueprint[];

  @OneToMany(() => Tag, tag => tag.project, { cascade: true })
  @JoinColumn()
  tags: Tag[];

  @OneToMany(() => File, file => file.project, { cascade: true })
  @JoinColumn()
  files: File[];
}