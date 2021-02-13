import { IsNumber } from "class-validator";

import { ApiProperty } from '@nestjs/swagger';
export class ProjectUserDto {

  @IsNumber()
  @ApiProperty()
  userId: number;

  @IsNumber()
  @ApiProperty()
  projectId: number;
}