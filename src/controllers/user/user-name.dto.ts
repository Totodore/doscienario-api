import { Length } from "class-validator";

export class UserNameDto {
  @Length(4, 40)
  name: string;
}