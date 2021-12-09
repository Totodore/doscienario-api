import { DataType } from '../data-type.entity';
import { Relationship } from '../relationship/relationship.entity';
import { BaseEntity, Column, CreateDateColumn, Entity, JoinColumn, JoinTable, ManyToMany, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Node } from "../node/node.entity";
import { Tag } from "../tag/tag.entity";
import { User } from "../user/user.entity";
import { Project } from "../project/project.entity";
import { ElementEntity, IElementEntity } from '../element/element.entity';

@Entity()
export class Blueprint extends ElementEntity implements IElementEntity {

  @OneToMany(() => Node, node => node.blueprint, { cascade: true })
  @JoinColumn()
  nodes: Node[];

  @OneToMany(() => Relationship, rel => rel.blueprint, { cascade: true })
  @JoinColumn()
  relationships: Relationship[];

  @Column({ nullable: true })
  x: number;

  @Column({ nullable: true })
  y: number;

  @ManyToMany(() => Tag, tag => tag.blueprints, { cascade: ["insert", "recover", "update"] })
  @JoinTable({
    name: "blueprint-tag",
    joinColumn: {
      name: "blueprintId", referencedColumnName: "id"
    },
    inverseJoinColumn: {
      name: "tagId", referencedColumnName: "id"
    },
  })
  tags: Tag[];

  readonly type = DataType.Blueprint;
}