import express from 'express';
import cors from 'cors';
import { WebSocketServer, WebSocket } from 'ws';

import { generateId } from './utils/crypto';
import { Node } from './types/node';

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

const PORT = '4300';
const server = app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
const wss = new WebSocketServer({ server });

const nodes = new Map<string, Node>();
const connections = new Map<WebSocket, string>();

wss.on('connection', (ws: WebSocket) => {
  ws.on('message', (message: string) => {
    const data = JSON.parse(message);
    console.log(`📩 Received message: ${JSON.stringify(data)}`);

    if (data.type === 'register') {
      const { callSign, ip, port } = data;
      console.log(`[REGISTER] Incoming node registration:`, data);

      if (callSign && ip && port) {
        nodes.set(callSign, { id: generateId(), callSign, ip, port });
        connections.set(ws, callSign);
        console.log(`✅ Node registered: ${callSign} (${ip}:${port})`);

        // Send full node list to new peer
        const availableNodes = Array.from(nodes.values());
        ws.send(JSON.stringify({ type: 'nodes', nodes: availableNodes }));

        // Notify all other peers (locally)
        wss.clients.forEach((client) => {
          if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: 'userAdded', callSign, ip, port }));
          }
        });
      } else {
        console.error(`❌ Invalid registration data:`, data);
      }
    }

    else if (data.type === 'discover') {
      console.log(`[DISCOVER] Sending node list to requester`);
      const availableNodes = Array.from(nodes.values());
      ws.send(JSON.stringify({ type: 'nodes', nodes: availableNodes }));
    }

    else if (data.type === 'addUser') {
      const { callSign, ip, port, senderCallSign, senderIp, senderPort } = data;
      console.log(`[ADD USER] ${senderCallSign} is adding ${callSign} (${ip}:${port})`);

      if (!nodes.has(callSign)) {
        nodes.set(callSign, { id: generateId(), callSign, ip, port });
        console.log(`✅ Registered new node: ${callSign} (${ip}:${port})`);
      }

      if (!nodes.has(senderCallSign)) {
        nodes.set(senderCallSign, { id: generateId(), callSign: senderCallSign, ip: senderIp, port: senderPort });
        console.log(`✅ Registered sender node: ${senderCallSign} (${senderIp}:${senderPort})`);
      }

      console.log(`📢 Notifying all nodes that ${senderCallSign} added ${callSign}`);

      // 🔥 **New: Notify ALL local WebSocket clients (UI users) about the new user**
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ type: 'userAdded', callSign, ip, port }));
        }
      });

      // 🔥 **New: Ensure the local server connects to the new peer server**
      const remoteWs = new WebSocket(`ws://${ip}:${port}`);

      remoteWs.on('open', () => {
        console.log(`✅ WebSocket connection established with ${callSign}`);
        connections.set(remoteWs, callSign);

        // 🔥 Send `userAddedBy` confirmation to the sender's server
        const senderWs = Array.from(connections.entries()).find(([ws, sign]) => sign === senderCallSign)?.[0];

        if (senderWs && senderWs.readyState === WebSocket.OPEN) {
          console.log(`📢 Sending userAddedBy confirmation to ${senderCallSign}`);
          senderWs.send(JSON.stringify({
            type: 'userAddedBy',
            callSign,
            ip,
            port
          }));
        }
      });

      remoteWs.on('error', (err) => {
        console.error(`❌ Error connecting to ${callSign}:`, err);
      });

      remoteWs.on('close', () => {
        console.log(`⚠️ Connection to ${callSign} closed.`);
        nodes.delete(callSign);
        connections.delete(remoteWs);
      });
    }  
  });

  ws.on('close', () => {
    const disconnectedCallSign = connections.get(ws);
    if (disconnectedCallSign) {
      nodes.delete(disconnectedCallSign);
      connections.delete(ws);
      console.log(`⚠️ Node disconnected: ${disconnectedCallSign}`);

      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ type: 'userRemoved', callSign: disconnectedCallSign }));
        }
      });
    }
  });
});
