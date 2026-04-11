import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { User } from './user.entity';
export declare class AuthService {
    private readonly userRepo;
    private readonly jwtService;
    constructor(userRepo: Repository<User>, jwtService: JwtService);
    register(username: string, password: string, nom?: string): Promise<{
        message: string;
    }>;
    login(username: string, password: string): Promise<{
        access_token: string;
        user: {
            id: number;
            username: string;
            nom: string;
            role: string;
        };
    }>;
    me(userId: number): Promise<User>;
}
