import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class GameEngineService {
  constructor(private readonly prisma: PrismaService) {}

  // TODO: Implement game logic
}
