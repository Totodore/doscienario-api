
import { DynamicModule, Provider } from "@nestjs/common";
import { getDataSourceToken } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import { TYPEORM_EX_CUSTOM_REPOSITORY } from "./typeorm-ex.decorators";
import { TypeormExInjectorService } from './typeorm-ex-injector.service';


/**
 * This module allow for repository declared with the @CustomRepository decorator to be injected into the module.
 */
export class TypeOrmExModule {

  public static providers: Provider[] = [TypeormExInjectorService];
  public static forCustomRepository<T extends new (...args: any[]) => any>(repositories: T[]): DynamicModule {
    for (const repository of repositories) {
      const entity = Reflect.getMetadata(TYPEORM_EX_CUSTOM_REPOSITORY, repository);
      if (!entity) {
        continue;
      }
      this.providers.push({
        inject: [getDataSourceToken()],
        provide: repository,
        useFactory: (dataSource: DataSource): typeof repository => {
          const baseRepository = dataSource.getRepository<any>(entity);
          return new repository(baseRepository.target, baseRepository.manager, baseRepository.queryRunner);
        },
      });
    }

    return {
      exports: this.providers,
      module: TypeOrmExModule,
      providers: this.providers,
    };
  }
}