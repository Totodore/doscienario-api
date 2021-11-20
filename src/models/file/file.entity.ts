import { BaseEntity, Column, CreateDateColumn, Entity, JoinColumn, JoinTable, ManyToMany, ManyToOne, OneToMany, PrimaryGeneratedColumn, RelationId, UpdateDateColumn } from "typeorm";
import { AppEntity } from "../app.entity";
import { Project } from "../project/project.entity";
import { Tag } from "../tag/tag.entity";
import { User } from "../user/user.entity";

@Entity()
export class File extends AppEntity {

  @PrimaryGeneratedColumn("uuid")
  id: string;

  @RelationId((file: File) => file.project)
  projectId: number;

  @RelationId((file: File) => file.createdBy)
  createdById: string;

  @ManyToOne(() => Project)
  @JoinColumn()
  project: Project;

  @ManyToOne(() => User)
  @JoinColumn()
  createdBy: User;

  @CreateDateColumn()
  createdDate: Date;

  @Column()
  mime: string;

  @Column()
  path: string;

  @Column()
  size: number;

  @RelationId((file: File) => file.tags)
  tagIds: number[];

  @ManyToMany(() => Tag, tag => tag.files, { cascade: ["insert", "recover", "update"] })
  @JoinTable({
    name: "files-tag",
    joinColumn: {
      name: "fileId", referencedColumnName: "id"
    },
    inverseJoinColumn: {
      name: "tagId", referencedColumnName: "id"
    },
  })
  tags: Tag[];

  @UpdateDateColumn()
  lastEditing: Date;

}