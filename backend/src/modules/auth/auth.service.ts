import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { User } from './user.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  async register(username: string, password: string, nom?: string) {
    const existing = await this.userRepo.findOne({ where: { username } });
    if (existing) throw new ConflictException('Nom d\'utilisateur déjà pris');

    const hashed = await bcrypt.hash(password, 10);
    const user = this.userRepo.create({ username, password: hashed, nom });
    await this.userRepo.save(user);
    return { message: 'Utilisateur créé' };
  }

  async login(username: string, password: string) {
    const user = await this.userRepo.findOne({ where: { username } });
    if (!user) throw new UnauthorizedException('Identifiants invalides');

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) throw new UnauthorizedException('Identifiants invalides');

    const payload = { sub: user.id, username: user.username, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
      user: { id: user.id, username: user.username, nom: user.nom, role: user.role },
    };
  }

  async me(userId: number) {
    return this.userRepo.findOne({ where: { id: userId }, select: ['id', 'username', 'nom', 'role'] });
  }
}
