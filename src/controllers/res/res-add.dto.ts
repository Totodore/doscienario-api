import { IsArray, IsNumber, IsString } from "class-validator";
import { Project } from "src/models/project.entity";

import { ApiProperty } from '@nestjs/swagger';
export class ResAddDto {
  @IsString()
  @ApiProperty()
  path: string;

  @IsArray()
  @ApiProperty()
  tags: number[];

  @IsNumber()
  @ApiProperty()
  projectId: number;
}