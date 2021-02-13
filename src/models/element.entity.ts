import { BaseEntity, Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Project } from "./project.entity";
import { User } from "./user.entity";
export abstract class ElementEntity extends BaseEntity {

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