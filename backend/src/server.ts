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
      console.log('[DATA --->]', data);

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
            console.log(`📢 Broadcasting new user ${callSign} to all clients`);
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
        console.log(`➕ User manually added: ${callSign} (${ip}:${port})`);

        // ✅ Notify ONLY the user who added this peer
        ws.send(JSON.stringify({ type: 'userAdded', callSign, ip, port }));

        // ✅ Find the WebSocket connection for Node B (the added user)
        const addedByCallSign = connections.get(ws); // The user who added them
        const addedByNode = nodes.get(addedByCallSign ?? ""); // The node of the user who added them

        if (addedByCallSign && addedByNode) {
          for (const [clientWs, clientCallSign] of connections.entries()) {
            if (clientCallSign === callSign && clientWs.readyState === WebSocket.OPEN) {
              console.log(`📢 Informing ${callSign} that they were added by ${addedByCallSign}`);
              clientWs.send(JSON.stringify({
                type: 'userAdded',
                callSign: addedByCallSign,
                ip: addedByNode.ip,
                port: addedByNode.port
              }));
            }
          }
        } else {
          console.error(`❌ Could not find user who added ${callSign}`);
        }
      } else {
        console.error('❌ Invalid user data:', data);
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
