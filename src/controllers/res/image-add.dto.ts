import { IsNumber } from "class-validator";
import { IsNull } from "typeorm";

import { ApiProperty } from '@nestjs/swagger';
export class ImageAddDto {
  @IsNumber()
  @ApiProperty()
  documentPos: number;

  @IsNumber()
  @ApiProperty()
  documentId: number;

  @IsNumber()
  @ApiProperty()
  projectId: number;
}