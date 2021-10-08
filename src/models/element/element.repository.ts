import { QueryDeepPartialEntity } from "typeorm/query-builder/QueryPartialEntity";
import { AppRepository } from "../app.repository";
import { ElementEntity } from "./element.entity";
import { Project } from "../project/project.entity";
import { Tag } from "../tag/tag.entity";
import { User } from "../user/user.entity";

export abstract class ElementRepository<T extends ElementEntity> extends AppRepository<T> {

  public async rename(id: number, title: string) {
    return super.update(id, { title: () => title });
  }

  public async addTag(id: number, title: string, projectId: number, userId: string) {
    let el = await this.findOne(id, { relations: ["tags"] });
    let tag = await Tag.findOneOrCreate<Tag>({ where: { title } }, {
      title,
      project: new Project(projectId),
      createdBy: new User(userId)
    });
    el.tags.push(tag);
    await el.save();
    return { el, tag };
  }

  public async removeTag(id: number, title: string) {
    const el = await this.findOne(id, { relations: ["tags"] });
    el.tags.splice(el.tags.findIndex(t => t.title === title), 1);
    return await el.save();
  }

}