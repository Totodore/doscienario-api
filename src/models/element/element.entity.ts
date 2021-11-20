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

  @Column("varchar", { length: 6, nullable: true })
  color?: string;

  @CreateDateColumn()
  createdDate: Date;

  @UpdateDateColumn()
  lastEditing: Date;

  @ManyToOne(() => Project, { cascade: ["insert", "recover", "update"] })
  @JoinColumn({ name: 'projectId' })
  project: Project;

  @Column()
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
export abstract class ContentElementEntity extends ElementEntity {

  @Column("text", { select: false, nullable: true })
  content: string;
}
export interface IElementEntity extends ElementEntity {
  tags?: Tag[];
  type: DataType;
}