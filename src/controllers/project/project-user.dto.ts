import { IsNumber, IsUUID } from "class-validator";

export class ProjectUserDto {

  @IsNumber()
  userId: number;

  @IsNumber()
  projectId: number;
}