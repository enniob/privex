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
  address: string;
  isOutgoing: boolean;
}
const peers = new Map<string, PeerInfo>();  // Map of peerId -> PeerInfo

// Utility logging functions for clarity
const log = (...args: any[]) => console.log(`[Node ${nodeId}]`, ...args);
const logError = (...args: any[]) => console.error(`[Node ${nodeId}]`, ...args);

/**
 * Attempt to establish a WebSocket connection to a peer address.
 * Includes reconnection logic on failure.
 */
function connectToPeer(address: string) {
  if (!address) return;
  log(`Attempting to connect to peer at ${address} ...`);
  try {
    const ws = new WebSocket(address);

    // Mark this connection as an outgoing attempt and store target address
    (ws as any).isOutgoing = true;
    (ws as any).address = address;
    (ws as any).handshakeSent = false;
    
    // Event: Connection opened (outgoing)
    ws.on('open', () => {
      log(`Connected to peer at ${address} (outgoing connection)`);
      
      const registerMessage = JSON.stringify({
        type: 'register',
        nodeId,
        callSign,
        ip: nodeIp,
        port: nodePort
      });

      ws.send(registerMessage);
      log(`Sent register message to ${address}: ${registerMessage}`);

      // Send handshake with this node's ID as soon as connection opens
      // if (!(ws as any).handshakeSent) {
      //   const handshakeMsg = JSON.stringify({ type: 'handshake', id: nodeId });
      //   ws.send(handshakeMsg);
      //   (ws as any).handshakeSent = true;
      //   log(`Sent handshake to ${address} with node ID ${nodeId}`);
      // }
    });

    // Event: Message received from peer
    ws.on('message', (data) => handleMessage(ws, data));

    // Event: Connection closed
    ws.on('close', (code, reason) => {
      const peerId = (ws as any).peerId;
      const addr = (ws as any).address;
      log(`Connection closed (code=${code}) ${peerId ? "with peer " + peerId : "from " + addr}. ${reason || ''}`);
      // Remove from peer map if present
      if (peerId && peers.get(peerId)?.ws === ws) {
        peers.delete(peerId);
        log(`Removed peer ${peerId} from active list`);
      }
      // If this was an outgoing connection, schedule reconnection
      if ((ws as any).isOutgoing && addr) {
        log(`Scheduling reconnect to ${addr} in 5 seconds...`);
        setTimeout(() => {
          connectToPeer(addr);
        }, 5000);
      }
    });

    // Event: Error on the connection
    ws.on('error', (err) => {
      logError(`WebSocket error on connection to ${address}:`, err);
      try { ws.close(); } catch (e) { /* ignore if already closed */ }
    });

  } catch (err) {
    logError(`Failed to connect to ${address}:`, err);
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

  if (msg.type === 'login') {
    callSign = msg.callSign;
    nodeIp = msg.ip;
    nodePort = msg.port;

    log(`Logedin as ${msg.callSign} (${msg.ip}:${msg.port})`);
  }

  if (msg.type === 'register' && msg.callSign && msg.ip) {
    const remoteId = crypto.randomBytes(4).toString('hex');
    log(`Received register message from ${msg.callSign} (${msg.ip}:${msg.port})`);

    if (!peers.has(remoteId)) {
      peers.set(remoteId, { ws, address: msg.ip, isOutgoing: false });
      log(`Registered peer ${msg.callSign} (${msg.ip}:${msg.port})`);
    }
  }

  // Handle handshake message
  // if (msg.type === 'handshake' && msg.id) {
  //   const remoteId = msg.id;
  //   const connection = ws as any;
  //   // If we haven't recorded this peer's ID on this socket yet:
  //   if (!connection.peerId) {
  //     connection.peerId = remoteId;
  //     const isOutgoing = !!connection.isOutgoing;
  //     const addr = connection.address || `${remoteId}`;
  //     log(`Received handshake from peer ${remoteId} (${isOutgoing ? 'outgoing' : 'incoming'} connection)`);

  //     // If this peer ID is already connected via another socket, handle duplicate
  //     if (peers.has(remoteId)) {
  //       const existing = peers.get(remoteId)!;
  //       const existingConn = existing.ws as any;
  //       // Determine which connection to keep:
  //       if (nodeId < remoteId) {
  //         // Our node ID is smaller, so we yield to the peer with higher ID.
  //         // If current connection is the one we initiated, close it; else close the other.
  //         if (isOutgoing) {
  //           log(`Duplicate connection to peer ${remoteId} detected. Closing outgoing connection (our ID is smaller).`);
  //           try { ws.close(); } catch {}
  //           return; // skip adding this connection
  //         } else {
  //           log(`Duplicate connection from peer ${remoteId} detected. Closing our outgoing connection (our ID is smaller).`);
  //           try { existingConn.close(); } catch {}
  //         }
  //       } else {
  //         // Our node ID is larger, we keep the connection we initiated.
  //         if (isOutgoing) {
  //           log(`Duplicate connection to peer ${remoteId} detected. Closing incoming connection from that peer (our ID is larger).`);
  //           try { existingConn.close(); } catch {}
  //         } else {
  //           log(`Duplicate connection from peer ${remoteId} detected. Closing this incoming connection (our ID is larger).`);
  //           try { ws.close(); } catch {}
  //           return;
  //         }
  //       }
  //       // After handling duplicates, fall through to add the remaining connection (if not returned).
  //     }

  //     // Add this peer to the map of active peers
  //     peers.set(remoteId, { ws, address: connection.address || 'unknown', isOutgoing: !!connection.isOutgoing });
  //     log(`Peer ${remoteId} added to active peer list`);
  //   }

  //   // Send our handshake ID back if we haven't already sent it on this socket
  //   if (!(ws as any).handshakeSent) {
  //     const reply = JSON.stringify({ type: 'handshake', id: nodeId });
  //     try {
  //       ws.send(reply);
  //       (ws as any).handshakeSent = true;
  //       log(`Sent handshake reply with node ID ${nodeId} to peer ${msg.id}`);
  //     } catch (err) {
  //       logError(`Failed to send handshake reply to ${msg.id}:`, err);
  //     }
  //   }
  //   return;  // Handshake handled, no further processing for this message
  // }

  // Handle other message types (application-specific messages)
  if ((ws as any).peerId) {
    log(`Received message from peer ${(ws as any).peerId}:`, msg);
    // Process application message as needed.
    // For example, broadcast to other peers or perform some action.
    // (This section can be customized based on the application's protocol)
  } else {
    log(`Received message before handshake was complete, ignoring.`);
  }
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
  // Initiate connections to any initial peers specified
  // if (initialPeers.length > 0) {
  //   log(`Initializing connections to configured peers: ${initialPeers.join(', ')}`);
  //   initialPeers.forEach(addr => connectToPeer(addr.trim()));
  // }
});
