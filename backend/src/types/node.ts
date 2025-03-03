import { WebSocket } from 'ws';

export interface Node {
    id: string;
    callSign: string | null;
    ip: string;
    port: number;
};

export interface Message {
    type: string;
    [key: string]: any;
}

export interface PingPong {
    type: 'ping' | 'pong';
}
