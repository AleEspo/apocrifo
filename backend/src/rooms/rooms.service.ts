import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { nanoid } from 'nanoid';

@Injectable()
export class RoomsService {
  constructor(private readonly prisma: PrismaService) {}

  async createRoom(data: any, userId: string) {
    const code = nanoid(6).toUpperCase();
    
    console.log('🔍 Creating room with userId:', userId);
    
    const room = await this.prisma.room.create({
      data: {
        code,
        type: data.type || 'PRIVATE',
        hostId: userId,
        maxPlayers: data.maxPlayers || 8,
        numRounds: data.numRounds || 3,  // 3 round per test
        writeTimer: data.writeTimer || 15,  // 15 secondi per test
        voteTimer: data.voteTimer || 10,    // 10 secondi per test
      },
    });

    console.log('✅ Room created:', room.code);

    return { code, room };
  }

  async getRoomByCode(code: string) {
    const room = await this.prisma.room.findUnique({
      where: { code },
      include: {
        players: {
          include: { user: true },
        },
      },
    });

    if (!room) {
      throw new NotFoundException('Stanza non trovata');
    }

    return room;
  }
}
