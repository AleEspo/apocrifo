import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { GameEngineService } from './game-engine.service';
import { JwtService } from '@nestjs/jwt';

@WebSocketGateway({
  namespace: '/game',
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  },
})
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly gameEngine: GameEngineService,
    private readonly jwtService: JwtService,
  ) {}

  afterInit() {
    this.gameEngine.setGateway(this);
  }

  async handleConnection(@ConnectedSocket() client: Socket) {
    try {
      const token = client.handshake.auth.token;
      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET || 'secret',
      });

      client.data.userId = payload.sub;
      console.log(`✅ Client connected: ${client.id}`);
    } catch (error) {
      client.disconnect();
    }
  }

  async handleDisconnect(@ConnectedSocket() client: Socket) {
    console.log(`❌ Client disconnected: ${client.id}`);
    await this.gameEngine.handleDisconnect(client.id);
  }

  @SubscribeMessage('room:join')
  async handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { roomCode: string },
  ) {
    try {
      const userId = client.data.userId;
      const result = await this.gameEngine.joinRoom(userId, payload.roomCode, client.id);
      
      client.join(payload.roomCode);
      
      client.to(payload.roomCode).emit('room:player_joined', {
        player: result.player,
        totalPlayers: result.players.length,
      });
      
      return { success: true, ...result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('game:get_state')
  async handleGetState(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { roomCode: string },
  ) {
    try {
      const currentState = await this.gameEngine.getCurrentGameState(payload.roomCode);
      return { success: true, ...currentState };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('room:ready')
  async handleReady(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { isReady: boolean; roomCode: string },
  ) {
    try {
      const userId = client.data.userId;
      const result = await this.gameEngine.updatePlayerReady(userId, payload.roomCode, payload.isReady);
      
      this.server.to(payload.roomCode).emit('room:player_ready', result);
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('game:start')
  async handleStartGame(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { roomCode: string },
  ) {
    try {
      const userId = client.data.userId;
      await this.gameEngine.startGame(userId, payload.roomCode);
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('game:submit_definition')
  async handleSubmitDefinition(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { definition: string; roundId: string; roomCode: string },
  ) {
    try {
      const userId = client.data.userId;
      await this.gameEngine.submitDefinition(userId, payload.roundId, payload.definition);
      
      client.to(payload.roomCode).emit('game:submission_received', {
        playerId: userId,
      });
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('game:vote')
  async handleVote(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { submissionId: string; roundId: string; roomCode: string },
  ) {
    try {
      const userId = client.data.userId;
      await this.gameEngine.submitVote(userId, payload.roundId, payload.submissionId);
      
      client.to(payload.roomCode).emit('game:vote_received', {
        playerId: userId,
      });
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('room:leave')
  async handleLeaveRoom(@ConnectedSocket() client: Socket) {
    await this.gameEngine.handleDisconnect(client.id);
    return { success: true };
  }
}
