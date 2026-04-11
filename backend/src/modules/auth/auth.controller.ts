import { Controller, Post, Get, Body, Request, UseGuards, HttpCode } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(200)
  async login(@Body() body: any) {
    console.log('LOGIN appelé avec:', body);
    const result = await this.authService.login(body.username, body.password);
    console.log('LOGIN résultat:', result);
    return result;
  }

  @Post('register')
  async register(@Body() body: any) {
    console.log('REGISTER appelé avec:', body);
    return this.authService.register(body.username, body.password, body.nom);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  me(@Request() req: any) {
    return this.authService.me(req.user.sub);
  }
}