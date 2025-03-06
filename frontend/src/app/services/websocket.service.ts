import { Injectable } from '@angular/core';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';
import { Observable, catchError, of } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class WebsocketService {
  private socket!: WebSocketSubject<any>;

  constructor() {
    const serverUrl = `ws://${window.location.hostname}:4300`; // Connect to local server.ts
    console.log(`🔌 Connecting UI WebSocket to: ${serverUrl}`);
    this.socket = webSocket(serverUrl);

    this.socket.subscribe({
      next: (message) => console.log("📩 Message received from server:", message),
      error: (error) => console.error("❌ WebSocket server error:", error),
      complete: () => console.log("⚠️ WebSocket server connection closed"),
    });
  }

  sendMessage(message: any) {
    if (this.socket && this.socket.closed !== true) {
      console.log(`📤 Sending message to server:`, message);
      this.socket.next(message);
    } else {
      console.error(`❌ WebSocket connection to server is not open`);
    }
  }

  receiveMessages(): Observable<any> {
    return new Observable((observer) => {
      this.socket.subscribe({
        next: (message) => {
          console.log("📩 Received WebSocket message from server:", message);
          observer.next(message);
        },
        error: (error) => {
          console.error("❌ WebSocket error:", error);
          observer.error(error);
        }
      });
    });
  }

  closeConnection() {
    if (this.socket) {
      this.socket.complete();
    }
  }
}
