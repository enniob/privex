import express from 'express';
import cors from 'cors';
import { WebSocketServer, WebSocket } from 'ws';

import { P2PConnection } from './p2p';
import { generateId } from './utils/crypto';
import { Message, Node } from './types/node';

const app = express();
app.use(cors({
    origin: '*'
}));
app.use(express.json());

const server = app.listen(4300, () => console.log('Server running on port 4300'));
const wss = new WebSocketServer({ server });

const nodes = new Map<string, Node>();

wss.on('connection', (ws: WebSocket, req) => {
  ws.on('message', (message: string) => {
      const data = JSON.parse(message);

        if (data.type === 'register') {
            const { callSign, ip, port } = data;

            if (callSign && ip && port) {
                nodes.set(callSign, { id: generateId(), callSign, ip, port });
                console.log(`Node registered: ${callSign} (${ip}:${port})`);

                const availableNodes = Array.from(nodes.values());
                ws.send(JSON.stringify({ type: 'nodes', nodes: availableNodes }));
            } else {
                console.error(`Invalid registration data: ${JSON.stringify(data)}`);
            }
        } else if (data.type === 'discover') {
            const availableNodes = Array.from(nodes.values());
            ws.send(JSON.stringify({ types: 'nodes', nodes: availableNodes }));
        } else if (data.type === 'addUser') {
            const { callSign, ip, port } = data;
      
            if (callSign && ip && port) {
              // Store the user's details
              nodes.set(callSign, { id: generateId(), callSign, ip, port });
              console.log(`User added: ${callSign} (${ip}:${port})`);
      
              // Notify all clients about the new user
              wss.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                  client.send(JSON.stringify({ type: 'userAdded', callSign, ip, port }));
                }
              });
            } else {
              console.error('Invalid user data:', data);
            }
          }
    });

    ws.on('close', () => {
        for (const [callSign, node] of nodes.entries()) {
            // if (node.ip === ws.ip && node.port === ws.port) {
            nodes.delete(callSign);
            console.log(`Node disconnected: ${callSign}`);
            // }
        }
    });
});

/**
 * Helper function to get the client's IP address.
 */
function getClientIp(req: any): string {
  const forwardedFor = req.headers['x-forwarded-for'];
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  return req.socket.remoteAddress;
}