import { BaseEntity, Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { AppEntity } from "./app.entity";
import { Project } from "./project.entity";
import { User } from "./user.entity";

@Entity()
export class Tag extends AppEntity {

  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @ManyToOne(() => Project)
  project: Project;

  @Column({ length: 6 })
  color: string;

  @ManyToOne(() => User)
  @JoinColumn()
  createdBy: User;

}