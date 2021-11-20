import { Tag } from "src/models/tag/tag.entity";
import { AddTagElementIn } from "../in/tag.in";

export class AddTagElementOut {
  constructor(
    public docId: number,
    public tag: Tag
  ) {}
}
export class RemoveTagElementOut extends AddTagElementIn { };