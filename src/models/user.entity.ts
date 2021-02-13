import { BaseEntity, Column, Entity, JoinColumn, JoinTable, ManyToMany, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { AppEntity } from "./app.entity";
import { Project } from "./project.entity";

@Entity()
export class User extends AppEntity {

  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  name: string;

  @Column({ select: false })
  password: string;

  @ManyToMany(() => Project)
  @JoinTable()
  projects: Project[];
}