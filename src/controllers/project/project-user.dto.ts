import { IsNumber, IsUUID } from "class-validator";

import { ApiProperty } from '@nestjs/swagger';
export class ProjectUserDto {

  @IsUUID()
  @ApiProperty()
  userId: string;

  @IsNumber()
  @ApiProperty()
  projectId: number;
}