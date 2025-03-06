import { Injectable } from '@angular/core';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';
import { Observable, BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class WebsocketService {
  private socket!: WebSocketSubject<any>;
  private serverUrl = `ws://${window.location.hostname}:4300`;
  private isConnected = new BehaviorSubject<boolean>(false); // Track connection status

  constructor() {
    this.connect(); // Ensure connection on service initialization
  }

  connect() {
    console.log(`🔌 Connecting to WebSocket server at: ${this.serverUrl}`);
    
    this.socket = webSocket(this.serverUrl);

    this.socket.subscribe({
      next: (message) => {
        console.log("📩 Message received from server:", message);
        this.isConnected.next(true); // Mark as connected
      },
      error: (error) => {
        console.error("❌ WebSocket server error:", error);
        this.isConnected.next(false); // Mark as disconnected
        setTimeout(() => this.connect(), 3000); // Retry connection after 3 seconds
      },
      complete: () => {
        console.log("⚠️ WebSocket server connection closed, attempting reconnect...");
        this.isConnected.next(false);
        setTimeout(() => this.connect(), 3000); // Retry connection
      },
    });
  }

  sendMessage(message: any) {
    if (this.socket && this.isConnected.value) {
      console.log(`📤 Sending message to server:`, message);
      this.socket.next(message);
    } else {
      console.error(`❌ WebSocket connection is not open, attempting to reconnect...`);
      this.connect();
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
      console.log("🔌 Closing WebSocket connection...");
      this.socket.complete();
      this.isConnected.next(false);
    }
  }
}
