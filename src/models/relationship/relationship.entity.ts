import { Blueprint } from '../blueprint/blueprint.entity';
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, RelationId } from "typeorm";
import { AppEntity } from "../app.entity";

@Entity()
export class Relationship extends AppEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  parentId: number

  @Column()
  childId: number;

  @Column()
  ox: number;

  @Column()
  oy: number;

  @Column()
  ex: number;

  @Column()
  ey: number;

  @ManyToOne(() => Blueprint)
  @JoinColumn()
  blueprint: Blueprint;

  @RelationId((rel: Relationship) => rel.blueprint)
  blueprintId: number;
}