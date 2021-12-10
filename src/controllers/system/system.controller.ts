import { Controller, Get, Query } from '@nestjs/common';

@Controller('system')
export class SystemController {

  @Get("check-version")
  public checkAllowedVersions(@Query("version") version: string) {
    const versions = ["2.0.42", "2.0.45", "2.0.46"];
    return { allowed: versions.includes(version), versions };
  }
}
