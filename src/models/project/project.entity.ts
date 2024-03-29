import { Image } from '../image/image.entity';
import { BeforeInsert, Column, CreateDateColumn, Entity, JoinColumn, JoinTable, ManyToMany, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { User } from "../user/user.entity";
import { Document } from "../document/document.entity";
import { Blueprint } from "../blueprint/blueprint.entity";
import { Tag } from "../tag/tag.entity";
import { AppEntity } from "../app.entity";
import { File } from "../file/file.entity";
import { v4 as uuid } from "uuid";
@Entity()
export class Project extends AppEntity {

  @PrimaryGeneratedColumn()
  id: number;

  @Column("uuid")
  uid: string;

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

  @BeforeInsert()
  public beforeInsert() {
    this.uid ??= uuid();
  }

}