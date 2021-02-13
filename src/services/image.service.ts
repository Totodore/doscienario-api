import { Injectable, OnModuleInit } from '@nestjs/common';
import { AppLogger } from "../utils/app-logger.util";

import * as fs from "fs-extra";
import * as path from "path";
import * as sharp from "sharp";

@Injectable()
export class ImageService implements OnModuleInit {

  private _baseRoute: string;

  constructor(private readonly _logger: AppLogger) { }

  async onModuleInit() {
    this._baseRoute = path.resolve("./data/images");
    await fs.ensureDir(this._baseRoute);
		this._logger.log("Base Image Route", this._baseRoute);
  }

	public getImage(id: string): Buffer {
		return fs.readFileSync(path.join(this._baseRoute, id))
	}

	/**
	 * Ecrit les images depuis un buffer donné
   * retourne une liste avec la taille du buffer, la largeur de l'image et la hauteur de l'image
	 */
  public async writeImage(file: Buffer, id: string): Promise<[number, number, number]> {
		const imgPath = path.join(this._baseRoute, id);
    try {
      const data = await this._resizeBuffer(file);
      fs.writeFileSync(imgPath, data[0]);
      return [data[0].length, data[1], data[2]];
    } catch (e) {
      this._logger.error(e);
      throw "Reading or compressing buffers error";
    }
	}

  private async _resizeBuffer(buffer: Buffer): Promise<[Buffer, number, number]> {
    let image = sharp(buffer);
    const metadata = await image.metadata();

    const newBuffer = await image.webp({ lossless: true }).toBuffer();
    this._logger.log("(WEBP) Size reduced from", Math.floor((1 - newBuffer.length / buffer.length) * 100), '%', (buffer.length / 1000).toFixed() + "kB", "->", (newBuffer.length / 1000).toFixed() + "kB");
    return [buffer, metadata.width, metadata.height];
  }

	public removeImage(id: string) {
		fs.removeSync(path.join(this._baseRoute, id.toString()));
	}

	public imageExist(id: string): boolean {
		return fs.existsSync(path.join(this._baseRoute, id));
  }
}
