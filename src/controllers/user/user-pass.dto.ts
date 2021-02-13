import { Length } from "class-validator";
import { ApiProperty } from '@nestjs/swagger';

export class UserPassDto {
  @Length(5, 40)
  @ApiProperty()
  password: string;

  @Length(5, 40)
  @ApiProperty()
  new_password: string;

}