import { IsNumber } from "class-validator";

import { ApiProperty } from '@nestjs/swagger';
export class ImageAddDto {

  @IsNumber()
  @ApiProperty()
  documentId: number;

  @IsNumber()
  @ApiProperty()
  projectId: number;
}