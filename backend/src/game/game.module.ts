import { Module } from '@nestjs/common';
import { GameGateway } from './game.gateway';
import { GameEngineService } from './game-engine.service';

@Module({
  providers: [GameGateway, GameEngineService],
})
export class GameModule {}
