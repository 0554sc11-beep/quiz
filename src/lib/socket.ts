import { GameRoom, Player } from '../types/game';
import { 
  getSupabaseClient, 
  getStoredSupabaseConfig, 
  syncRoomToSupabase, 
  syncPlayerToSupabase, 
  syncSubmissionToSupabase, 
  syncBuzzToSupabase 
} from './supabase';

type MessageHandler = (room: GameRoom) => void;

class RealtimeConnection {
  private ws: WebSocket | null = null;
  private roomCode: string = '';
  private player: Player | null = null;
  private messageHandlers: Set<MessageHandler> = new Set();
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isConnecting: boolean = false;
  private supabaseChannel: any = null;

  public subscribe(handler: MessageHandler) {
    this.messageHandlers.add(handler);
    return () => {
      this.messageHandlers.delete(handler);
    };
  }

  private notify(room: GameRoom) {
    for (const handler of this.messageHandlers) {
      handler(room);
    }
  }

  public connect(roomCode: string, player: Player) {
    this.roomCode = roomCode.trim().toUpperCase();
    this.player = player;

    this.connectWebSocket();
    this.setupSupabaseRealtime();
    syncPlayerToSupabase(this.roomCode, player);
  }

  private setupSupabaseRealtime() {
    const config = getStoredSupabaseConfig();
    const supabase = getSupabaseClient();

    if (!config.enabled || !supabase || !this.roomCode) return;

    if (this.supabaseChannel) {
      supabase.removeChannel(this.supabaseChannel);
    }

    this.supabaseChannel = supabase
      .channel(`game_${this.roomCode}`)
      .on('broadcast', { event: 'room_state' }, (payload: any) => {
        if (payload?.payload?.room) {
          this.notify(payload.payload.room);
        }
      })
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'game_rooms', filter: `code=eq.${this.roomCode}` },
        (_payload: any) => {
          // If database changes, fetch updated snapshot if needed
        }
      )
      .subscribe();
  }

  private connectWebSocket() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.isConnecting = true;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.isConnecting = false;
        if (this.roomCode && this.player) {
          this.send('JOIN_ROOM', { player: this.player });
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'ROOM_STATE' && data.room) {
            this.notify(data.room);

            const config = getStoredSupabaseConfig();
            if (config.enabled) {
              if (this.player?.role === 'teacher') {
                syncRoomToSupabase(data.room);
                if (this.supabaseChannel) {
                  this.supabaseChannel.send({
                    type: 'broadcast',
                    event: 'room_state',
                    payload: { room: data.room },
                  });
                }
              }
            }
          }
        } catch (err) {
          console.error('Failed to parse WS message:', err);
        }
      };

      this.ws.onclose = () => {
        this.isConnecting = false;
        this.ws = null;
        if (!this.reconnectTimer) {
          this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            if (this.roomCode && this.player) {
              this.connectWebSocket();
            }
          }, 2000);
        }
      };

      this.ws.onerror = () => {
        this.ws?.close();
      };
    } catch {
      this.isConnecting = false;
    }
  }

  public send(type: string, payload: any = {}) {
    // Sync to Supabase directly if applicable
    if (this.roomCode) {
      if (type === 'SUBMIT_KEYWORDS') {
        syncSubmissionToSupabase(this.roomCode, {
          id: `sub_${payload.playerId}`,
          playerId: payload.playerId,
          authorName: payload.authorName,
          keywords: payload.keywords,
          story: payload.story,
          isRevealed: false,
          revealedKeywordCount: 0,
        });
      } else if (type === 'BUZZ_GUESS') {
        syncBuzzToSupabase(this.roomCode, {
          id: `buzz_${Date.now()}`,
          submissionId: '',
          playerId: payload.playerId,
          playerName: this.player?.name || '',
          guessName: payload.guessName,
          isCorrect: false,
          points: 0,
          timestamp: Date.now(),
        });
      }
    }

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type,
          roomCode: this.roomCode,
          payload,
        })
      );
    } else {
      fetch(`/api/rooms/${this.roomCode}`)
        .then((res) => res.json())
        .then((room) => {
          if (room) this.notify(room);
        })
        .catch(() => {});
    }
  }

  public disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    if (this.supabaseChannel) {
      const supabase = getSupabaseClient();
      supabase?.removeChannel(this.supabaseChannel);
      this.supabaseChannel = null;
    }
  }
}

export const realtimeClient = new RealtimeConnection();
