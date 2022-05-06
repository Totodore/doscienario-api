import { DataType } from '../data-type.entity';
import { Relationship } from '../relationship/relationship.entity';
import { Column, Entity, JoinColumn, JoinTable, ManyToMany, OneToMany } from "typeorm";
import { Node } from "../node/node.entity";
import { Tag } from "../tag/tag.entity";
import { ElementEntity, IElementEntity } from '../element/element.entity';

@Entity()
export class Blueprint extends ElementEntity implements IElementEntity {

  @OneToMany(() => Node, node => node.blueprint, { cascade: true })
  @JoinColumn()
  nodes: Node[];

  @OneToMany(() => Relationship, rel => rel.blueprint, { cascade: true })
  @JoinColumn()
  relationships: Relationship[];

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