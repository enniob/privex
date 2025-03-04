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

        // Notify all other peers
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
        // ✅ Ensure Node B (newly added node) is registered
        if (!nodes.has(callSign)) {
          nodes.set(callSign, { id: generateId(), callSign, ip, port });
          console.log(`✅ Registered new node: ${callSign} (${ip}:${port})`);
        }

        // ✅ Ensure Node A (sender) is registered on Node B’s server
        if (!nodes.has(senderCallSign)) {
          nodes.set(senderCallSign, { id: generateId(), callSign: senderCallSign, ip: senderIp, port: senderPort });
          console.log(`✅ Registered sender node: ${senderCallSign} (${senderIp}:${senderPort})`);
        }

        // ✅ Notify Node B about Node A
        let nodeBWs: WebSocket | undefined;
        for (const [clientWs, clientCallSign] of connections.entries()) {
          if (clientCallSign === callSign) {
            nodeBWs = clientWs;
            break;
          }
        }

        if (nodeBWs && nodeBWs.readyState === WebSocket.OPEN) {
          console.log(`📢 Informing ${callSign} about ${senderCallSign}`);
          nodeBWs.send(JSON.stringify({
            type: 'userAddedBy',
            callSign: senderCallSign,
            ip: senderIp,
            port: senderPort
          }));
        } else {
          console.error(`❌ No WebSocket found for ${callSign}`);
        }

        // ✅ Confirm to Node A that Node B was added
        let nodeAWs: WebSocket | undefined;
        for (const [clientWs, clientCallSign] of connections.entries()) {
          if (clientCallSign === senderCallSign) {
            nodeAWs = clientWs;
            break;
          }
        }

        if (nodeAWs && nodeAWs.readyState === WebSocket.OPEN) {
          console.log(`📢 Informing ${senderCallSign} that ${callSign} was added.`);
          nodeAWs.send(JSON.stringify({
            type: 'userAdded',
            callSign,
            ip,
            port
          }));
        } else {
          console.error(`❌ No WebSocket found for ${senderCallSign}`);
        }
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

      // Notify all peers about disconnection
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ type: 'userRemoved', callSign: disconnectedCallSign }));
        }
      });
    }
  });
});
