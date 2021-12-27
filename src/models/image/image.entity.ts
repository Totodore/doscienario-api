import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Project } from "../project/project.entity";
import { User } from "../user/user.entity";
import { AppEntity } from "../app.entity";

@Entity()
export class Image extends AppEntity {

  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  size: number;

  @Column()
  height: number;

  @Column()
  width: number;

  @UpdateDateColumn()
  uploadedDate: Date;

  @ManyToOne(() => User)
  @JoinColumn()
  addedBy: User;

  @ManyToOne(() => Project)
  @JoinColumn()
  project: Project;

  @UpdateDateColumn()
  lastEditing: Date;
}