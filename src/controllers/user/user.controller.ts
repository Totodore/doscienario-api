import { BadRequestException, Body, Controller, ForbiddenException, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { GetUser } from 'src/decorators/user.decorator';
import { UserGuard } from 'src/guards/user.guard';
import { User } from 'src/models/user.entity';
import { AppLogger } from 'src/utils/app-logger.service';
import { JwtService } from 'src/services/jwt.service';
import { UserAuthDto } from './user-auth.dto';
import { UserNameDto } from './user-name.dto';
import { UserPassDto } from './user-pass.dto';

@Controller('user')
export class UserController {

  constructor(
    private readonly _jwt: JwtService,
    private readonly _logger: AppLogger
  ) {}

  @Post("/auth")
  async auth(@Body() body: UserAuthDto): Promise<string> {
    const user = (await User.findOne({ where: { name: body.name.toLowerCase() }, select: ["password", "id"] }));

    if (!user || !this._jwt.verifyPassword(user.password, body.password))
      throw new ForbiddenException();

    const jwt = this._jwt.encode(user.id);
    return jwt;
  }

  @Post("/register")
  async register(@Body() body: UserAuthDto): Promise<string> {
    const hash = this._jwt.encodePassword(body.password);
    if (await User.exists({ where: { name: body.name.toLowerCase() } }))
      throw new BadRequestException();
    const user = await User.create({ name: body.name.toLowerCase(), password: hash }).save();
    const jwt = this._jwt.encode(user.id);
    return jwt;
  }

  @Patch("/password")
  @UseGuards(UserGuard)
  async updatePass(@Body() body: UserPassDto, @GetUser() user: User): Promise<User> {
    const password = (await User.findOne(user.id, { select: ["password"] })).password;
    if (!user || !this._jwt.verifyPassword(password, body.password))
      throw new ForbiddenException();

    user.password = this._jwt.encodePassword(body.new_password);
    return await user.save();
  }

  @Patch("/name")
  @UseGuards(UserGuard)
  async updateName(@Body() body: UserNameDto, @GetUser() user: User): Promise<User> {
    if (await User.exists({ where: { name: body.name.toLowerCase() } }))
      throw new BadRequestException();
    user.name = body.name.toLowerCase();
    return await user.save();
  }

  @Get("/me")
  @UseGuards(UserGuard)
  async getInfo(@GetUser({ joinProjects: true }) user: User): Promise<User> {
    return user;
  }
}
