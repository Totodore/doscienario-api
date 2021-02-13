import { BaseEntity, Column, Entity, JoinColumn, ManyToMany, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { AppEntity } from "./app.entity";
import { Project } from "./project.entity";
import { Tag } from "./tag.entity";
import { User } from "./user.entity";

@Entity()
export class File extends AppEntity {

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

  @Column()
  mime: string;

  @Column()
  path: string;

  @Column()
  size: number;

  @ManyToMany(() => Tag)
  @JoinColumn()
  tags: Tag[];
}