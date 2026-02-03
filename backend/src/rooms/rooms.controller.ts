import { Controller, Post, Get, Param, Body, Headers, UnauthorizedException } from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { JwtService } from '@nestjs/jwt';

@Controller('rooms')
export class RoomsController {
  constructor(
    private readonly roomsService: RoomsService,
    private readonly jwtService: JwtService,
  ) {}

  @Post()
  async create(@Body() body: any, @Headers('authorization') auth: string) {
    console.log('🔍 Authorization header:', auth);
    
    if (!auth || !auth.startsWith('Bearer ')) {
      throw new UnauthorizedException('No token provided');
    }

    const token = auth.split(' ')[1];
    console.log('🔍 Token:', token.substring(0, 20) + '...');

    try {
      const payload = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET || 'secret',
      });
      console.log('🔍 JWT Payload:', payload);
      
      const userId = payload.sub;
      console.log('🔍 User ID:', userId);
      
      if (!userId) {
        throw new UnauthorizedException('Invalid token');
      }

      return this.roomsService.createRoom(body, userId);
    } catch (err) {
      console.error('❌ JWT Error:', err.message);
      throw new UnauthorizedException('Invalid token');
    }
  }

  @Get(':code')
  async getRoom(@Param('code') code: string) {
    return this.roomsService.getRoomByCode(code);
  }
}
