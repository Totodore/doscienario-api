import { IsString, Length } from "class-validator";

export class UserAuthDto {

  @IsString()
  @Length(5, 40)
  name: string;

  @IsString()
  @Length(5, 40)
  password: string;
}