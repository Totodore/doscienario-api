import { IsNumber } from "class-validator";
import { IsNull } from "typeorm";

export class ImageAddDto {
  @IsNumber()
  documentPos: number;

  @IsNumber()
  documentId: number;

  @IsNumber()
  projectId: number;
}