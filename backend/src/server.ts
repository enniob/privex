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

      if (callSign && ip && port && senderCallSign && senderIp && senderPort) {
        if (!nodes.has(callSign)) {
          nodes.set(callSign, { id: generateId(), callSign, ip, port });
          console.log(`✅ Registered new node: ${callSign} (${ip}:${port})`);
        }

        if (!nodes.has(senderCallSign)) {
          nodes.set(senderCallSign, { id: generateId(), callSign: senderCallSign, ip: senderIp, port: senderPort });
          console.log(`✅ Registered sender node: ${senderCallSign} (${senderIp}:${senderPort})`);
        }

        connections.set(ws, senderCallSign);
        console.log(`🔗 Storing WebSocket connection for ${senderCallSign}`);

        console.log(`🔗 Establishing WebSocket connection from ${senderCallSign} to ${callSign} (${ip}:${port})`);
        const remoteWs = new WebSocket(`ws://${ip}:${port}`);

        remoteWs.on('open', () => {
          console.log(`✅ WebSocket connection established between ${senderCallSign} and ${callSign}`);
          connections.set(remoteWs, callSign);
          
          remoteWs.send(JSON.stringify({
            type: 'register',
            callSign: senderCallSign,
            ip: senderIp,
            port: senderPort
          }));
        });

        remoteWs.on('message', (message: any) => {
          const receivedData = JSON.parse(message);
          console.log(`📩 Message from ${callSign}:`, receivedData);

          wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify(receivedData));
            }
          });
        });

        remoteWs.on('error', (err) => {
          console.error(`❌ Error connecting to ${callSign}:`, err);
        });

        remoteWs.on('close', () => {
          console.log(`⚠️ Connection to ${callSign} closed.`);
          nodes.delete(callSign);
          connections.delete(remoteWs);
        });

        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: 'userAdded', callSign, ip, port }));
          }
        });
      } else {
        console.error(`❌ Invalid addUser data:`, data);
      }
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
