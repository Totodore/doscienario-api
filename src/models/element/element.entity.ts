import { BeforeInsert, Column, CreateDateColumn, JoinColumn, ManyToOne, PrimaryGeneratedColumn, RelationId, UpdateDateColumn } from "typeorm";
import { AppEntity } from "../app.entity";
import { DataType } from "../data-type.entity";
import { Project } from "../project/project.entity";
import { Tag } from "../tag/tag.entity";
import { User } from "../user/user.entity";
import { v4 as uuid } from "uuid";

export abstract class ElementEntity extends AppEntity {

  @PrimaryGeneratedColumn()
  id: number;

  @Column("uuid", { unique: true })
  uid: string;

  @CreateDateColumn()
  createdDate: Date;

  @UpdateDateColumn()
  lastEditing: Date;

  @ManyToOne(() => Project, { cascade: ["insert", "recover", "update"] })
  @JoinColumn()
  project: Project;

  @RelationId((element: ElementEntity) => element.project)
  projectId: number;

  @ManyToOne(() => User, { cascade: true })
  createdBy: User;

  @RelationId((element: ElementEntity) => element.createdBy)
  createdById: string;

  @ManyToOne(() => User, { cascade: true })
  lastEditor: User;

  @Column()
  title: string;


  @BeforeInsert()
  public beforeInsert() {
    this.uid ??= uuid();
  }
}
export interface IElementEntity extends ElementEntity {
  tags?: Tag[];
  type: DataType;
}