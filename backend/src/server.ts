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

        // ✅ Find the WebSocket connection for the node that added the new peer
        const addingNodeCallSign = connections.get(ws);
        const addingNode = nodes.get(addingNodeCallSign ?? "");

        if (addingNodeCallSign && addingNode) {
          console.log(`📢 ${addingNodeCallSign} added ${callSign}`);

          // ✅ Notify the node that was added
          for (const [clientWs, clientCallSign] of connections.entries()) {
            if (clientCallSign === callSign && clientWs.readyState === WebSocket.OPEN) {
              console.log(`📢 Informing ${callSign} about the node that added it: ${addingNodeCallSign}`);
              clientWs.send(JSON.stringify({
                type: 'userAddedBy',
                callSign: addingNodeCallSign,
                ip: addingNode.ip,
                port: addingNode.port
              }));
            }
          }

          // ✅ Notify the node that did the adding
          ws.send(JSON.stringify({
            type: 'userAdded',
            callSign,
            ip,
            port
          }));
        } else {
          console.error(`❌ Could not find user who added ${callSign}`);
        }
      } else {
        console.error('❌ Invalid user data:', data);
      }
    }
  });

  ws.on('close', () => {
    const disconnectedCallSign = connections.get(ws);

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
