import { IsNumber, IsString } from "class-validator";

import { ApiProperty } from '@nestjs/swagger';
export class ResAddDto {
  @IsString()
  @ApiProperty()
  path: string;

  @IsNumber()
  @ApiProperty()
  projectId: number;
}