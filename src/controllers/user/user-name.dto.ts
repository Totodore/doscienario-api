import { Length } from "class-validator";
import { ApiProperty } from '@nestjs/swagger';

export class UserNameDto {
  @Length(4, 40)
  @ApiProperty()
  name: string;
}