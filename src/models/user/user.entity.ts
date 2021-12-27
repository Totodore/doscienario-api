import { Exclude } from "class-transformer";
import { Column, Entity, ManyToMany, PrimaryGeneratedColumn } from "typeorm";
import { AppEntity } from "../app.entity";
import { Project } from "../project/project.entity";

@Entity()
export class User extends AppEntity {

  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  name: string;

  @Column({ select: false })
  @Exclude()
  password: string;

  @ManyToMany(() => Project, project => project.users, { cascade: true })
  projects: Project[];
}