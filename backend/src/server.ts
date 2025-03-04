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
        connections.set(ws, callSign); // ✅ Store WebSocket connection for this node
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
      const { callSign, ip, port } = data;
      console.log(`[ADD USER] Request to add ${callSign} (${ip}:${port})`);

      if (callSign && ip && port) {
        nodes.set(callSign, { id: generateId(), callSign, ip, port });

        // ✅ Ensure that we can find the node that is adding this user
        const addingNodeCallSign = connections.get(ws);
        if (!addingNodeCallSign) {
          console.error(`❌ Could not determine who is adding ${callSign}.`);
          return;
        }

        const addingNode = nodes.get(addingNodeCallSign);
        if (!addingNode) {
          console.error(`❌ Adding node (${addingNodeCallSign}) not found.`);
          return;
        }

        console.log(`✅ ${addingNodeCallSign} is adding ${callSign}`);

        // ✅ Notify Node B (the newly added user) about Node A (who added them)
        let nodeBWs: WebSocket | undefined;
        for (const [clientWs, clientCallSign] of connections.entries()) {
          if (clientCallSign === callSign) {
            nodeBWs = clientWs;
            break;
          }
        }

        if (nodeBWs && nodeBWs.readyState === WebSocket.OPEN) {
          console.log(`📢 Informing ${callSign} about ${addingNodeCallSign}`);
          nodeBWs.send(JSON.stringify({
            type: 'userAddedBy',
            callSign: addingNode.callSign,
            ip: addingNode.ip,
            port: addingNode.port
          }));
        } else {
          console.error(`❌ No WebSocket found for ${callSign}`);
        }

        // ✅ Confirm to Node A that Node B was added
        console.log(`✅ Confirming to ${addingNodeCallSign} that ${callSign} was added`);
        ws.send(JSON.stringify({
          type: 'userAdded',
          callSign,
          ip,
          port
        }));
      } else {
        console.error(`❌ Invalid user data:`, data);
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
