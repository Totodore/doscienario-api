import { User } from './../user/user.entity';
import { BaseEntity, Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class Logs extends BaseEntity {

  @PrimaryGeneratedColumn()
  public id: number;

  @Column("text")
  public message: string;

  @Column("text")
  public logs: string;

  @Column("boolean", { default: false })
  public solved: boolean;

  @ManyToOne(() => User)
  @JoinColumn()
  public user: User;

  @CreateDateColumn()
  public createdDate: Date;
}