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

  async updatePlayerReady(userId: string, roomCode: string, isReady: boolean) {
    const room = await this.prisma.room.findUnique({
      where: { code: roomCode },
      include: { players: true },
    });

    const player = room.players.find(p => p.userId === userId);
    if (!player) throw new Error('Player not in room');

    await this.prisma.playerSession.update({
      where: { id: player.id },
      data: { isReady },
    });

    return { playerId: userId, isReady };
  }

  async startGame(userId: string, roomCode: string) {
    const room = await this.prisma.room.findUnique({
      where: { code: roomCode },
      include: { players: true },
    });

    if (!room) throw new Error('Room not found');
    if (room.hostId !== userId) throw new Error('Only host can start');
    if (room.players.length < 3) {
      throw new Error('Servono almeno 3 giocatori');
    }
    if (!room.players.every(p => p.isReady)) {
      throw new Error('Non tutti i giocatori sono pronti');
    }

    await this.prisma.room.update({
      where: { id: room.id },
      data: { 
        currentState: GameState.SHOW_WORD,
        currentRound: 1,
        startedAt: new Date(),
      },
    });

    await this.startRound(room.id, roomCode, 1);
  }

  private async startRound(roomId: string, roomCode: string, roundNumber: number) {
    const room = await this.prisma.room.findUnique({
      where: { id: roomId },
    });

    const word = await this.getRandomWord();
    
    const round = await this.prisma.round.create({
      data: {
        roomId,
        wordId: word.id,
        roundNumber,
        startedAt: new Date(),
      },
    });

    console.log(`🎮 Starting round ${roundNumber} with word: ${word.lemma}, roundId: ${round.id}`);

    this.broadcastStateChange(roomCode, {
      state: GameState.SHOW_WORD,
      data: {
        roundId: round.id,
        word: {
          lemma: word.lemma,
          partOfSpeech: word.partOfSpeech,
        },
        roundNumber,
        totalRounds: room.numRounds,
      },
    });

    this.setTimer(roomCode, async () => {
      await this.transitionToWritePhase(roomId, roomCode, round.id, room.writeTimer);
    }, 5000);
  }

  private async transitionToWritePhase(roomId: string, roomCode: string, roundId: string, writeTimer: number) {
    await this.prisma.room.update({
      where: { id: roomId },
      data: { currentState: GameState.WRITE_DEF },
    });

    const round = await this.prisma.round.findUnique({
      where: { id: roundId },
      include: { word: true },
    });

    const expiresAt = Date.now() + writeTimer * 1000;

    console.log(`✍️ Transitioning to WRITE_DEF for round ${roundId}`);

    this.broadcastStateChange(roomCode, {
      state: GameState.WRITE_DEF,
      data: {
        roundId,
        word: {
          lemma: round.word.lemma,
          partOfSpeech: round.word.partOfSpeech,
        },
        timeLimit: writeTimer,
        expiresAt,
      },
    });

    this.setTimer(roomCode, async () => {
      await this.transitionToVotePhase(roomId, roomCode, roundId);
    }, writeTimer * 1000);
  }

  async submitDefinition(userId: string, roundId: string, definition: string) {
    const round = await this.prisma.round.findUnique({
      where: { id: roundId },
      include: { room: { include: { players: true } } },
    });

    const player = round.room.players.find(p => p.userId === userId);
    if (!player) throw new Error('Not in game');

    const existing = await this.prisma.submission.findFirst({
      where: { 
        roundId, 
        playerId: player.id 
      },
    });

    if (existing) throw new Error('Already submitted');

    await this.prisma.submission.create({
      data: {
        roundId,
        playerId: player.id,
        userId,
        definition,
        isReal: false,
      },
    });

    return { success: true };
  }

  private async transitionToVotePhase(roomId: string, roomCode: string, roundId: string) {
    const round = await this.prisma.round.findUnique({
      where: { id: roundId },
      include: { 
        word: true,
        submissions: true,
        room: { include: { players: true } },
      },
    });

    for (const player of round.room.players) {
      const hasSubmitted = round.submissions.some(s => s.playerId === player.id);
      if (!hasSubmitted) {
        await this.prisma.submission.create({
          data: {
            roundId,
            playerId: player.id,
            userId: player.userId,
            definition: '(Non ha risposto in tempo)',
            isReal: false,
          },
        });
      }
    }

    const realSubmission = await this.prisma.submission.create({
      data: {
        roundId,
        playerId: null,
        userId: null,
        definition: round.word.definition,
        isReal: true,
      },
    });

    const allSubmissions = await this.prisma.submission.findMany({
      where: { roundId },
    });

    const shuffled = this.shuffle(allSubmissions);

    await this.prisma.room.update({
      where: { id: roomId },
      data: { currentState: GameState.VOTE },
    });

    const expiresAt = Date.now() + round.room.voteTimer * 1000;

    this.broadcastStateChange(roomCode, {
      state: GameState.VOTE,
      data: {
        roundId,
        options: shuffled.map(s => ({
          id: s.id,
          definition: s.definition,
        })),
        timeLimit: round.room.voteTimer,
        expiresAt,
      },
    });

    this.setTimer(roomCode, async () => {
      await this.transitionToResults(roomId, roomCode, roundId);
    }, round.room.voteTimer * 1000);
  }

  async submitVote(userId: string, roundId: string, submissionId: string) {
    const round = await this.prisma.round.findUnique({
      where: { id: roundId },
      include: { room: { include: { players: true } } },
    });

    const player = round.room.players.find(p => p.userId === userId);
    if (!player) throw new Error('Not in game');

    const submission = await this.prisma.submission.findUnique({
      where: { id: submissionId },
    });

    if (submission.playerId === player.id) {
      throw new Error('Cannot vote for your own definition');
    }

    const existing = await this.prisma.vote.findUnique({
      where: { roundId_playerId: { roundId, playerId: player.id } },
    });

    if (existing) throw new Error('Already voted');

    await this.prisma.vote.create({
      data: {
        roundId,
        playerId: player.id,
        userId,
        submissionId,
      },
    });

    return { success: true };
  }

  private async transitionToResults(roomId: string, roomCode: string, roundId: string) {
    const round = await this.prisma.round.findUnique({
      where: { id: roundId },
      include: {
        submissions: true,
        votes: true,
        room: { include: { players: { include: { user: true } } } },
      },
    });

    const realSubmission = round.submissions.find(s => s.isReal);
    
    const scoring = [];
    for (const player of round.room.players) {
      let pointsEarned = 0;
      const breakdown: any = {};

      const playerVote = round.votes.find(v => v.playerId === player.id);
      if (playerVote && playerVote.submissionId === realSubmission.id) {
        // ⭐ CAMBIATO: +3 invece di +2
        pointsEarned += 3;
        breakdown.correctVote = 3;
      }

      const playerSubmission = round.submissions.find(s => s.playerId === player.id && !s.isReal);
      if (playerSubmission) {
        const votesReceived = round.votes.filter(v => v.submissionId === playerSubmission.id).length;
        if (votesReceived > 0) {
          pointsEarned += votesReceived;
          breakdown.votesReceived = votesReceived;
        }
      }

      await this.prisma.playerSession.update({
        where: { id: player.id },
        data: { score: { increment: pointsEarned } },
      });

      scoring.push({
        playerId: player.id,
        nickname: player.user.nickname,
        pointsEarned,
        breakdown,
      });
    }

    const players = await this.prisma.playerSession.findMany({
      where: { roomId },
      include: { user: true },
      orderBy: { score: 'desc' },
    });

    await this.prisma.room.update({
      where: { id: roomId },
      data: { currentState: GameState.RESULTS },
    });

    this.broadcastStateChange(roomCode, {
      state: GameState.RESULTS,
      data: {
        correctSubmissionId: realSubmission.id,
        scoring,
        leaderboard: players.map((p, i) => ({
          rank: i + 1,
          playerId: p.id,
          nickname: p.user.nickname,
          totalScore: p.score,
        })),
      },
    });

    this.setTimer(roomCode, async () => {
      const room = await this.prisma.room.findUnique({ where: { id: roomId } });
      if (room.currentRound < room.numRounds) {
        await this.prisma.room.update({
          where: { id: roomId },
          data: { currentRound: { increment: 1 } },
        });
        await this.startRound(roomId, roomCode, room.currentRound + 1);
      } else {
        await this.endGame(roomId, roomCode);
      }
    }, 10000);
  }

  private async endGame(roomId: string, roomCode: string) {
    const players = await this.prisma.playerSession.findMany({
      where: { roomId },
      include: { user: true },
      orderBy: { score: 'desc' },
    });

    await this.prisma.room.update({
      where: { id: roomId },
      data: { 
        currentState: GameState.END_GAME,
        endedAt: new Date(),
      },
    });

    this.broadcastStateChange(roomCode, {
      state: GameState.END_GAME,
      data: {
        finalLeaderboard: players.map((p, i) => ({
          rank: i + 1,
          playerId: p.id,
          nickname: p.user.nickname,
          score: p.score,
        })),
      },
    });
  }

  private async getRandomWord() {
    const words = await this.prisma.word.findMany({
      where: { isActive: true },
    });

    if (words.length === 0) {
      throw new Error('No words available');
    }

    const randomIndex = Math.floor(Math.random() * words.length);
    console.log(`📖 Selected word ${randomIndex + 1}/${words.length}: ${words[randomIndex].lemma}`);
    
    return words[randomIndex];
  }

  private shuffle<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  private setTimer(roomCode: string, callback: () => void, ms: number) {
    this.clearTimer(roomCode);
    console.log(`⏰ Setting timer for ${roomCode}: ${ms}ms`);
    const timer = setTimeout(() => {
      console.log(`⏰ Timer fired for ${roomCode}`);
      callback();
    }, ms);
    this.roomTimers.set(roomCode, timer);
  }

  private clearTimer(roomCode: string) {
    const timer = this.roomTimers.get(roomCode);
    if (timer) {
      clearTimeout(timer);
      this.roomTimers.delete(roomCode);
    }
  }

  private broadcastStateChange(roomCode: string, data: any) {
    if (this.gateway) {
      this.gateway.server.to(roomCode).emit('game:state_change', data);
    }
  }
}
