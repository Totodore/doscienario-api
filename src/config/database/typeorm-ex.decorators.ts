// typeorm-ex.decorator.ts
import 'reflect-metadata';

export const TYPEORM_EX_CUSTOM_REPOSITORY = "TYPEORM_EX_CUSTOM_REPOSITORY";

export function CustomRepository(entity: Function): ClassDecorator {
  return Reflect.metadata(TYPEORM_EX_CUSTOM_REPOSITORY, entity);
}

export const TYPEORM_EX_LOAD_CUSTOM_REPO = "TYPEORM_EX_LOAD_CUSTOM_REPO";
export function LoadCustomRepository(): PropertyDecorator {
  return (target, propertyKey) => {
    const previousKeys = Reflect.getMetadata(TYPEORM_EX_LOAD_CUSTOM_REPO, target) || [];
    Reflect.defineMetadata(TYPEORM_EX_LOAD_CUSTOM_REPO, [...previousKeys, propertyKey], target);
  }
}