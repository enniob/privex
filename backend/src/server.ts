import express from 'express';
import http from 'http';
import WebSocket, { WebSocketServer } from 'ws';
import crypto from 'crypto';  // for generating unique node IDs

const app = express();
// (Optional) Express middleware and routes can be added here
app.use(express.json());  // for JSON parsing in HTTP endpoints if needed
app.get('/', (_req, res) => {
  res.send('Server is running')
});

// Create an HTTP server and attach the Express app
const server = http.createServer(app);

// Initialize a WebSocket server on the same HTTP server (same port)
const wss = new WebSocketServer({ server });

// Generate a unique ID for this node instance (not persisted across restarts)
const nodeId = crypto.randomBytes(4).toString('hex');
let callSign = '';
let nodeIp = '';
let nodePort = '';

const PORT = process.env.PORT || 4300;

// Configuration: list of peer WebSocket addresses to connect to (if any)
// const initialPeers = process.env.PEERS ? process.env.PEERS.split(',') : [];

// Data structures to track peers
interface PeerInfo {
  ws: WebSocket;
  callSign: string;
}
const peers = new Map<string, PeerInfo>();  // Map of peerId -> PeerInfo

// Utility logging functions for clarity
const log = (...args: any[]) => console.log(`[Node ${nodeId}]`, ...args);
const logError = (...args: any[]) => console.error(`[Node ${nodeId}]`, ...args);

/**
 * Registers the node when a user logs in. 
 */
function registerNode(msg: any) {
  if (!msg.callSign || !msg.ip || !msg.port) {
    log(`Invalid registration data: ${msg}`);
  }

  callSign = msg.callSign;
  nodeIp = msg.ip;
  nodePort = msg.port;

  log(`Logedin as ${msg.callSign} (${msg.ip}:${msg.port})`);
}

/**
 *  Handles adding a peer when "Add User" is clicked. 
 */
function addPeer(msg: any) {
  const { peerCallSign, peerIp, peerPort } = msg;

  if(!peerCallSign || !peerIp || !peerPort) {
    log(`Invalid peer data:`, msg);
    return;
  }

  const peerAddress = `ws://${peerIp}:${peerPort}`;

  if(peers.has(peerAddress)) {
    log(`Already connected to ${peerCallSign} at ${peerAddress}`);
    return;
  }

  log(`Attempting to connect to ${peerCallSign} at ${peerAddress}...`);

  try {
    const ws = new WebSocket(peerAddress);

    ws.on('open', () => {
      log(`Connected to peer ${peerCallSign}`);

      const confirmMessage = JSON.stringify({
        type: 'confirmUser',
        peerCallSign: callSign,
        peerIp: nodeIp,
        peerPort: nodePort
      });
      
      ws.send(confirmMessage);
      log(`Sent confirmation to ${peerCallSign}`);
    });

    ws.on('message', (data) => handleMessage(ws, data));
    ws.on('close', () => {
      log(`Connection to ${peerCallSign} closed.`);
      peers.delete(peerAddress);
    });

    ws.on('error', (err) => log(`Error connecting to ${peerCallSign}:`, err));

    peers.set(peerAddress, { ws, callSign: peerCallSign });
  } catch(err) {
    log(`Failed to connect to ${peerCallSign}:`, err);
  }
}

/**
 * Send message to a Node 
 */
function sendMessage(msg: any, senderWs: WebSocket) {
  const { recipientCallSign, content } = msg;

  if (!recipientCallSign || !content) {
    log(`Invalid message data:`, msg);
    return;
  }

  log(`Available peers:`, [...peers.values()].map(p => p.callSign));

  const recipientPeer = [...peers.values()].find(peer => peer.callSign === recipientCallSign);

  if (recipientPeer && recipientPeer.ws.readyState === WebSocket.OPEN) {
    log(`Forwarding message from ${callSign} to ${recipientCallSign}`);

    const messagePayload = JSON.stringify({
      type: 'forwardedMessage',
      sender: callSign,
      recipientCallSign,
      content
    });

    recipientPeer.ws.send(messagePayload);

    broadCastToUI({ type: 'messageSent', recipientCallSign, content }, senderWs);
    log(`Message forwarded to ${recipientCallSign}`);
  } else {
    log(`Recipient ${recipientCallSign} is not available`);
    broadCastToUI({ type: 'messageFailed', recipientCallSign, reason: 'Recipient not available' }, senderWs);
  }
}

/**
 * Handle incoming messages on a WebSocket.
 * This covers both handshake messages and general data messages.
 */
function handleMessage(ws: WebSocket, data: WebSocket.RawData) {
  let msg;
  try {
    msg = JSON.parse(data.toString());
  } catch {
    // If message is not JSON, ignore if handshake not done, otherwise treat as raw message
    if (!(ws as any).peerId) {
      log(`Received non-JSON data before handshake, ignoring.`);
      return;
    }
    log(`Received raw message from peer ${(ws as any).peerId}: ${data}`);
    return;
  }

  switch(msg.type) {
    case 'login': {
      registerNode(msg);
      break;
    }

    case 'confirmUser': {
      log(`Received confirmation from ${msg.peerCallSign} (${msg.peerIp}: ${msg.peerPort})`);

      const peerAddress = `ws://${msg.peerIp}:${msg.peerPort}`;
      if(!peers.has(peerAddress)) {
        peers.set(peerAddress, { ws, callSign: msg.peerCallSign });
        log(`Peer connection established with ${msg.peerCallSign}`);
      }

      broadCastToUI({
        type: 'peerConfirmed',
        peerCallSign: msg.peerCallSign,
        peerIp: msg.peerIp,
        peerPort: msg.peerPort
      }, ws);

      break;
    }

    case 'addUser': {
      log(`Received addUser request: ${msg}`);
      addPeer(msg);
      break;
    }

    case 'message': {
      log(`Received chat message from ${msg.sender} to ${msg.recipientCallSign}`);
      sendMessage(msg, ws);
      break;
    }

    case 'forwardedMessage': {
      log(`Received forwarded message from ${msg.sender} to ${msg.recipientCallSign}`);
      if (msg.recipientCallSign === callSign) {
        broadCastToUI({
          type: 'messageReceived',
          sender: msg.sender,
          content: msg.content
        }, ws);
      } else {
        log(`This message was not meant for me, ignoring.`);
      }
      break;
    }

    default: {
      log(`Received message: ${msg}`);
    }
  }
}

function broadCastToUI(msg: any, ws: any) {
  msg = JSON.stringify(msg);

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN && client !== ws) {
      client.send(msg);
    }
  });

  log(`Broadcasted to UI: ${msg}`);
}

// Listen for incoming WebSocket connections (peer nodes connecting to this node)
wss.on('connection', (ws, req) => {
  const clientAddr = `${req.socket.remoteAddress}:${req.socket.remotePort}`;

  (ws as any).isOutgoing = false;
  (ws as any).address = clientAddr;
  (ws as any).handshakeSent = false;
  log(`New incoming connection from ${clientAddr}`);

  // Set up message, close, error handlers for the incoming socket
  ws.on('message', (data) => handleMessage(ws, data));

  ws.on('close', (code, reason) => {
    const peerId = (ws as any).peerId;
    log(`Peer connection closed (code=${code}) ${peerId ? "for peer " + peerId : "from " + clientAddr}. ${reason || ''}`);
    if (peerId && peers.get(peerId)?.ws === ws) {
      peers.delete(peerId);
      log(`Removed peer ${peerId} from active list`);
    }
    // We do not actively reconnect to incoming peers; assume they will reconnect if needed
  });

  ws.on('error', (err) => {
    logError(`Error on connection from ${clientAddr}:`, err);
    try { ws.close(); } catch {}  // Ensure socket is closed on error
  });
  // Note: We expect the remote peer (as client) to send a handshake message next.
});

// Start the HTTP + WebSocket server
server.listen(PORT, () => {
  log(`Express server listening on port ${PORT}`);
});
