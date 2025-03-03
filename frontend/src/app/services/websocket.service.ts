import { Injectable } from '@angular/core';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';
import { Observable, catchError, of } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class WebsocketService {
  private sockets: { [key: string]: WebSocketSubject<any> } = {};

  connect(url: string) {
    console.log(`Connecting to WebSocket server at ${url}`);

    // Store the connection under a generic key for server communication
    if (!this.sockets['server']) {
      this.sockets['server'] = webSocket(url);

      this.sockets['server'].subscribe({
        next: (message) => console.log("Server message received:", message),
        error: (error) => console.error("WebSocket server error:", error),
        complete: () => console.log("WebSocket server connection closed"),
      });
    }
  }

  // Connect to a peer's WebSocket server
  connectToPeer(url: string, peerId: string) {
    if (!this.sockets[peerId]) {
      this.sockets[peerId] = webSocket(url);

      this.sockets[peerId].subscribe({
        next: () => console.log(`WebSocket connection established with ${peerId}`),
        error: (error) => console.error(`WebSocket connection error with ${peerId}:`, error),
        complete: () => console.log(`WebSocket connection closed with ${peerId}`),
      });
    }
  }

  // Send a message to a specific peer
  sendMessageToPeer(peerId: string, message: any) {
    if (this.sockets[peerId]) {
      this.sockets[peerId].next(message);
    } else {
      console.error(`No WebSocket connection found for peer ${peerId}`);
    }
  }

  // Listen for incoming messages from all peers
  receiveMessages(): Observable<any> {
    return new Observable((observer) => {
        Object.values(this.sockets).forEach((socket) => {
            socket.subscribe({
                next: (message) => {
                    console.log("Received WebSocket message:", message);
                    observer.next(message);
                },
                error: (error) => {
                    console.error("WebSocket error:", error);
                    observer.error(error);
                }
            });
        });
    });
  }

  // Automatically connect to new peers
  autoConnectToNewPeer(peer: { callSign: string, ip: string, port: string }) {
    const url = `ws://${peer.ip}:${peer.port}`;
    
    if (!this.sockets[peer.callSign]) {
        console.log(`Connecting to new peer: ${peer.callSign} (${url})`);
        this.connectToPeer(url, peer.callSign);
    }
  }

  // Close the WebSocket connection with a specific peer
  closeConnectionToPeer(peerId: string) {
    if (this.sockets[peerId]) {
      this.sockets[peerId].complete();
      delete this.sockets[peerId];
    }
  }
}
