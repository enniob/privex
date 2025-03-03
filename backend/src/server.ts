import express from 'express';
import cors from 'cors';
import { WebSocketServer, WebSocket } from 'ws';

import { generateId } from './utils/crypto';
import { Node } from './types/node';

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

const server = app.listen(4300, () => console.log('Server running on port 4300'));
const wss = new WebSocketServer({ server });

const nodes = new Map<string, Node>();
const connections = new Map<WebSocket, string>();

wss.on('connection', (ws: WebSocket) => {
  ws.on('message', (message: string) => {
    const data = JSON.parse(message);

    if (data.type === 'register') {
      const { callSign, ip, port } = data;

      if (callSign && ip && port) {
        nodes.set(callSign, { id: generateId(), callSign, ip, port });
        connections.set(ws, callSign);
        console.log(`Node registered: ${callSign} (${ip}:${port})`);

        // Send full node list to new peer
        const availableNodes = Array.from(nodes.values());
        ws.send(JSON.stringify({ type: 'nodes', nodes: availableNodes }));

        // Notify all other peers about this new node
        wss.clients.forEach((client) => {
          if (client !== ws && client.readyState === WebSocket.OPEN) {
            console.log(`Broadcasting new user ${callSign} to all clients`);
            client.send(JSON.stringify({
              type: 'userAdded',
              callSign,
              ip,
              port
            }));
          }
        });
      } else {
        console.error(`Invalid registration data: ${JSON.stringify(data)}`);
      }
    }

    else if (data.type === 'discover') {
      const availableNodes = Array.from(nodes.values());
      ws.send(JSON.stringify({ type: 'nodes', nodes: availableNodes }));
    }

    else if (data.type === 'addUser') {
      const { callSign, ip, port } = data;

      if (callSign && ip && port) {
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
    const disconnectedCallSign = connections.get(ws); // Get the callSign for the disconnected WebSocket

    if (disconnectedCallSign) {
      nodes.delete(disconnectedCallSign);
      connections.delete(ws);
      console.log(`Node disconnected: ${disconnectedCallSign}`);

      // Notify all other peers that a user disconnected
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ type: 'userRemoved', callSign: disconnectedCallSign }));
        }
      });
    }
  });
});
