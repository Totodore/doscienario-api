import { IsString, Length } from "class-validator";
import { ApiProperty } from '@nestjs/swagger';

export class UserAuthDto {

  @IsString()
  @Length(5, 40)
  @ApiProperty()
  name: string;

  @IsString()
  @Length(5, 40)
  @ApiProperty()
  password: string;
}