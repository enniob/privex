import { WebSocket } from 'ws';
import { Message } from './types/node';

export class P2PConnection {
    private ws: WebSocket;
    private callSign: string;

    constructor( ws: WebSocket, callSign: string) {
        this.ws = ws;
        this.callSign = callSign;

        this.ws.on('message', (message: string) => this.handleMessage(message));
    }

    private handleMessage(message: string) {
        const data: Message = JSON.parse(message);

        switch(data.type) {
            case 'message':
                console.log(`Message from ${this.callSign}: ${data.text}`);
                break;
            default:
                console.warn(`Uknown message type: ${data.type}`);
        }
    }

    public sendMessage(text: string) {
        const message: Message = {
            type: 'message',
            text
        };

        this.ws.send(JSON.stringify(message));
    }

    public close() {
        this.ws.close();
    }
}

export const connectToNode = (callSign: string, ip: string, port: number): P2PConnection | null => {
    const ws = new WebSocket(`ws://${ip}:${port}`);

    ws.on('open', () => {
        console.log(`Connected to ${callSign} at ${ip}:${port}`);
    });

    ws.on('error', (error) => {
        console.error(`Connection error with ${callSign}:`, error);
    });

    return new P2PConnection(ws, callSign);
};
