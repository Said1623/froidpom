import { AuthService } from './auth.service';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    login(body: any): Promise<{
        access_token: string;
        user: {
            id: number;
            username: string;
            nom: string;
            role: string;
        };
    }>;
    register(body: any): Promise<{
        message: string;
    }>;
    me(req: any): Promise<import("./user.entity").User>;
}
