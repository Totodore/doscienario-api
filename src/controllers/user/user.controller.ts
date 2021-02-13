import { Body, Controller, ForbiddenException, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { GetUser } from 'src/decorators/user.decorator';
import { UserGuard } from 'src/guards/user.guard';
import { User } from 'src/models/user.entity';
import { AppLogger } from 'src/utils/app-logger.service';
import { JwtService } from 'src/services/jwt.service';
import { UserAuthDto } from './user-auth.dto';
import { UserNameDto } from './user-name.dto';
import { UserPassDto } from './user-pass.dto';
import { UserRes } from './user.res';

@Controller('user')
export class UserController {

  constructor(
    private readonly _jwt: JwtService,
    private readonly _logger: AppLogger
  ) {}

  @Post("/auth")
  async auth(@Body() body: UserAuthDto): Promise<string> {
    const user = (await User.findOne({ where: { name: body.name }, select: ["password", "id"] }));

    if (!user || !this._jwt.verifyPassword(user.password, body.password))
      throw new ForbiddenException();

    const jwt = this._jwt.encode(user.id);
    return jwt;
  }

  @Post("/register")
  async register(@Body() body: UserAuthDto): Promise<string> {
    const hash = this._jwt.encodePassword(body.password);
    const user = await User.create({ name: body.name, password: hash }).save();
    const jwt = this._jwt.encode(user.id);
    return jwt;
  }

  @Patch("/password")
  @UseGuards(UserGuard)
  async updatePass(@Body() body: UserPassDto, @GetUser() user: User) {
    const password = (await User.findOne(user.id, { select: ["password"] })).password;
    if (!user || !this._jwt.verifyPassword(password, body.password))
      throw new ForbiddenException();

    user.password = this._jwt.encodePassword(body.new_password);
    await user.save();
  }

  @Patch("/name")
  @UseGuards(UserGuard)
  async updateName(@Body() body: UserNameDto, @GetUser() user: User) {
    user.name = body.name;
    await user.save();
  }

  @Get("/me")
  @UseGuards(UserGuard)
  async getInfo(@GetUser() user: User): Promise<UserRes> {
    const userRes = await User.findOne({ relations: ["projects"], where: { id: user.id } });
    this._logger.log(userRes.projects.length);
    return new UserRes(userRes);
  }
}
