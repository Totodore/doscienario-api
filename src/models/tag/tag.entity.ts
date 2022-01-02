import { Blueprint } from '../blueprint/blueprint.entity';
import { File } from '../file/file.entity';
import { Column, Entity, JoinColumn, ManyToMany, ManyToOne, PrimaryGeneratedColumn, RelationId } from "typeorm";
import { AppEntity } from "../app.entity";
import { Project } from "../project/project.entity";
import { User } from "../user/user.entity";
import { Document } from "../document/document.entity";
import { Node } from "../node/node.entity";
import { DataType } from '../data-type.entity';
@Entity()
export class Tag extends AppEntity {

  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  /**
   * @deprecated Will not be used anymore
   */
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