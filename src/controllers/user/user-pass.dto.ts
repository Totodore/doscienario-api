import { Length } from "class-validator";

export class UserPassDto {
  @Length(5, 40)
  password: string;

  @Length(5, 40)
  new_password: string;

}