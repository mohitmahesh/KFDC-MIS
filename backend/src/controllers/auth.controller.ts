import { Controller, Post, Body, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';

@Controller('auth')
export class AuthController {
    constructor(
        @InjectRepository(User) private userRepo: Repository<User>,
    ) { }

    @Post('login')
    async login(@Body() body: any) {
        const { email, password } = body;
        const user = await this.userRepo.findOne({ where: { email } });

        if (!user || user.password !== password) {
            throw new UnauthorizedException('Invalid credentials');
        }

        // In a real app, generate a JWT here. For this migration parity, returning a dummy token.
        return {
            token: 'dummy-jwt-token-' + user.id,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                division_id: user.division_id,
                range_id: user.range_id,
            },
        };
    }
}
