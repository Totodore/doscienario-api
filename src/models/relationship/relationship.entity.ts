import { Blueprint } from '../blueprint/blueprint.entity';
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, RelationId } from "typeorm";
import { AppEntity } from "../app.entity";

export enum Pole {
  North = "N",
  South = "S",
  East = "E",
  West = "W"
}

export enum RelationshipType {
  Direct = "direct",
  Loopback = "loopback",
}
@Entity()
export class Relationship extends AppEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  parentId: number

  @Column()
  childId: number;

  @Column({ enum: Pole, type: "enum" })
  parentPole: Pole;

  @Column({ enum: Pole, type: "enum" })
  childPole: Pole;

  @Column({ enum: RelationshipType, type: "enum", default: RelationshipType.Direct })
  type: RelationshipType;

  @ManyToOne(() => Blueprint)
  @JoinColumn()
  blueprint: Blueprint;

  @RelationId((rel: Relationship) => rel.blueprint)
  blueprintId: number;
}