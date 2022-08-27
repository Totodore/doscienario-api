import * as moduleAlias from 'module-alias';
import { resolve } from 'path';

const rootPath = resolve(__dirname, '..', '..', 'dist');
moduleAlias.addAliases({
  '@src': rootPath,
});