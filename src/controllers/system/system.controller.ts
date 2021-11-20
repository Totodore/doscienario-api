import { Controller, Get, Query } from '@nestjs/common';

@Controller('system')
export class SystemController {

  @Get("valid-version")
  public checkAllowedVersions(@Query("version") version: string) {
    const versions = ["2.0.40"];
    return { allowed: version.includes(version), versions };
  }
}
