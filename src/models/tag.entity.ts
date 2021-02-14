import { BaseEntity, Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, RelationId } from "typeorm";
import { AppEntity } from "./app.entity";
import { Project } from "./project.entity";
import { User } from "./user.entity";

@Entity()
export class Tag extends AppEntity {

  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  primary: boolean;

  @RelationId((tag: Tag) => tag.project)
  projectId: number;

  @RelationId((tag: Tag) => tag.createdBy)
  createdById: string;

  @ManyToOne(() => Project)
  project: Project;

  @Column({ length: 6, nullable: true })
  color: string;

  @ManyToOne(() => User)
  @JoinColumn()
  createdBy: User;

}