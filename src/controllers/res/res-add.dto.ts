import { IsArray, IsNumber, IsString } from "class-validator";
import { Project } from "src/models/project/project.entity";

import { ApiProperty } from '@nestjs/swagger';
export class ResAddDto {
  @IsString()
  @ApiProperty()
  path: string;

  @IsNumber()
  @ApiProperty()
  projectId: number;
}