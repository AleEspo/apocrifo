import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GameState } from '@prisma/client';

@Injectable()
export class GameEngineService {
  private roomTimers = new Map<string, NodeJS.Timeout>();
  private gateway: any;

  constructor(private readonly prisma: PrismaService) {}

  setGateway(gateway: any) {
    this.gateway = gateway;
  }

  async joinRoom(userId: string, roomCode: string, socketId: string) {
    const room = await this.prisma.room.findUnique({
      where: { code: roomCode },
      include: { 
        players: { 
          include: { user: true },
          where: { isConnected: true } // Solo giocatori connessi
        } 
      },
    });

    if (!room) {
      throw new Error('Stanza non trovata');
    }

    // 🔧 FIX: Prima pulisci eventuali sessioni disconnesse dello stesso utente
    await this.prisma.playerSession.deleteMany({
      where: {
        roomId: room.id,
        userId: userId,
        isConnected: false,
      },
    });

    // 🔧 FIX: Usa upsert invece di findUnique + create
    const player = await this.prisma.playerSession.upsert({
      where: {
        roomId_userId: {
          roomId: room.id,
          userId: userId,
        },
      },
      update: {
        socketId,
        isConnected: true,
        // Non resettare isReady se si riconnette
      },
      create: {
        roomId: room.id,
        userId,
        socketId,
        isConnected: true,
        isReady: false,
        score: 0,
      },
      include: { user: true },
    });

    // Ricontrolla il conteggio giocatori ATTIVI
    const activePlayers = await this.prisma.playerSession.count({
      where: { 
        roomId: room.id,
        isConnected: true,
      },
    });

    if (activePlayers > room.maxPlayers) {
      throw new Error('Stanza piena');
    }

    const players = await this.prisma.playerSession.findMany({
      where: { 
        roomId: room.id,
        isConnected: true, // Solo giocatori connessi
      },
      include: { user: true },
    });

    return {
      room: {
        ...room,
        hostId: room.hostId,
      },
      player: {
        id: player.userId,
        nickname: player.user.nickname,
        isReady: player.isReady,
        isConnected: player.isConnected,
      },
      players: players.map(p => ({
        id: p.userId,
        nickname: p.user.nickname,
        isReady: p.isReady,
        isConnected: p.isConnected,
      })),
    };
  }

  // 🔧 FIX: Cleanup quando disconnette
  async handleDisconnect(socketId: string) {
    const player = await this.prisma.playerSession.findFirst({
      where: { socketId },
      include: { room: true },
    });

    if (player) {
      console.log(`👋 Player ${player.userId} disconnected from room ${player.room.code}`);
      
      // Marca come disconnesso invece di eliminare
      await this.prisma.playerSession.update({
        where: { id: player.id },
        data: { isConnected: false },
      });

      // Notifica gli altri giocatori
      if (this.gateway) {
        const remainingPlayers = await this.prisma.playerSession.findMany({
          where: { 
            roomId: player.roomId,
            isConnected: true,
          },
          include: { user: true },
        });

        this.gateway.server.to(player.room.code).emit('room:player_left', {
          playerId: player.userId,
          players: remainingPlayers.map(p => ({
            id: p.userId,
            nickname: p.user.nickname,
            isReady: p.isReady,
            isConnected: p.isConnected,
          })),
        });
      }
    }
  }

  async getCurrentGameState(roomCode: string) {
    const room = await this.prisma.room.findUnique({
      where: { code: roomCode },
      include: {
        players: { 
          include: { user: true },
          where: { isConnected: true }, // Solo connessi
        },
      },
    });

    if (!room) throw new Error('Room not found');

    if (room.currentState === 'LOBBY') {
      return { state: 'LOBBY' };
    }

    const currentRound = await this.prisma.round.findFirst({
      where: {
        roomId: room.id,
        roundNumber: room.currentRound,
      },
      include: { word: true, submissions: true },
    });

    if (!currentRound) {
      return { state: 'LOADING' };
    }

    const players = await this.prisma.playerSession.findMany({
      where: { 
        roomId: room.id,
        isConnected: true, // Solo connessi
      },
      include: { user: true },
      orderBy: { score: 'desc' },
    });

    const baseData = {
      roundId: currentRound.id,
      roundNumber: room.currentRound,
      totalRounds: room.numRounds,
      word: {
        lemma: currentRound.word.lemma,
        partOfSpeech: currentRound.word.partOfSpeech,
      },
      leaderboard: players.map(p => ({
        id: p.userId,
        nickname: p.user.nickname,
        score: p.score,
      })),
    };

    return {
      state: room.currentState,
      data: baseData,
    };
  }

  // ... resto del codice invariato ...
  // (Le altre funzioni rimangono identiche)
