import { BaseEntity, Column, Entity, JoinColumn, ManyToMany, ManyToOne, OneToMany, PrimaryGeneratedColumn, RelationId } from "typeorm";
import { AppEntity } from "./app.entity";
import { Project } from "./project.entity";
import { Tag } from "./tag.entity";
import { User } from "./user.entity";

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

  @Column("timestamp", { default: () => "CURRENT_TIMESTAMP"})
  createdDate: Date;

  @Column()
  mime: string;

  @Column()
  path: string;

  @Column()
  size: number;

  @RelationId((file: File) => file.tags)
  tagIds: number[];

  @ManyToMany(() => Tag)
  @JoinColumn()
  tags: Tag[];
}