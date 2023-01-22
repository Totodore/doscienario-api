import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';
export class ProjectAddDto {
  @ApiProperty()
  @IsString()
  name: string;
}