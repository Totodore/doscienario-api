import { ClassProvider, Injectable, OnModuleInit } from "@nestjs/common";
import { ModuleRef } from "@nestjs/core";
import { Repository } from "typeorm";
import { TYPEORM_EX_LOAD_CUSTOM_REPO } from "./typeorm-ex.decorators";
import { TypeOrmExModule } from "./typeorm-ex.module";

/**
 * This service will inject repositories declared with the @LoadCustomRepository property decorator into the module.
 * It allows repositories to be injected into other repositories
 */
@Injectable()
export class TypeormExInjectorService implements OnModuleInit {

  constructor(
    private readonly _moduleRef: ModuleRef
  ) { }

  public onModuleInit() {
    for (const repo of TypeOrmExModule.providers) {
      if (!(repo as ClassProvider).provide)
        continue;
      const repoInstance = this._moduleRef.get((repo as ClassProvider).provide);
      if (repoInstance instanceof Repository)
        this.hydrateCustomRepository(repoInstance);
    }
  }

  private hydrateCustomRepository(repo: Repository<any>) {
    const keys: string[] = Reflect.getMetadata(TYPEORM_EX_LOAD_CUSTOM_REPO, repo);
    for (const key of keys || []) {
      const type = Reflect.getMetadata("design:type", repo, key);
      repo[key] = this._moduleRef.get(type);
    }
  }
}