import { Blueprint } from './blueprint.entity';
import { File } from './file.entity';
import { BaseEntity, Column, Entity, JoinColumn, ManyToMany, ManyToOne, PrimaryColumn, PrimaryGeneratedColumn, RelationId } from "typeorm";
import { AppEntity } from "./app.entity";
import { Project } from "./project.entity";
import { User } from "./user.entity";
import { Document } from "./document.entity";
import { Node } from "./node.entity";
import { DataType } from './data-type.entity';
@Entity()
export class Tag extends AppEntity {

  @PrimaryGeneratedColumn()
  id: number;

  @PrimaryColumn({ unique: true })
  name: string;

  @Column({ default: false })
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

  @ManyToMany(() => Document, doc => doc.tags, { cascade: true })
  documents: Document[];

  @ManyToMany(() => Blueprint, blueprint => blueprint.tags, { cascade: true })
  blueprints: Blueprint[];

  @ManyToMany(() => Node, node => node.tags, { cascade: true })
  nodes: Node[];

  @ManyToMany(() => File, file => file.tags, { cascade: true })
  files: File[];

  readonly type = DataType.Tag;
}