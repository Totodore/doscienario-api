import { ApiProperty } from '@nestjs/swagger';
export class ProjectAddDto {
  @ApiProperty()
  name: string;
}