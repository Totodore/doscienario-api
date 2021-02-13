import { BaseEntity, Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Node } from "./node.entity";

@Entity()
export class Relationship extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  parentId: number

  @Column()
  childId: number;

  @ManyToOne(() => Node)
  @JoinColumn({ name: "childId" })
  child: Node;

  @ManyToOne(() => Node)
  @JoinColumn({ name: "parentId" })
  parent: Node;
}