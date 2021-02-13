import { BaseEntity, Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { AppEntity } from "./app.entity";
import { Project } from "./project.entity";
import { User } from "./user.entity";
export abstract class ElementEntity extends AppEntity {

  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Project)
  @JoinColumn()
  project: Project;

  @ManyToOne(() => User)
  @JoinColumn()
  createdBy: User;

  @Column("timestamp", { default: () => "CURRENT_TIMESTAMP"})
  createdDate: Date;
}