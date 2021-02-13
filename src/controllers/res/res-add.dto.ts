import { IsArray, IsNumber, IsString } from "class-validator";
import { Project } from "src/models/project.entity";

export class ResAddDto {
  @IsString()
  path: string;

  @IsArray()
  tags: number[];

  @IsNumber()
  projectId: number;
}