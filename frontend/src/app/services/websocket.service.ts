import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class WebsocketService {
  private socket: WebSocket | null = null;
  private isConnected = false;
  private messageSubject = new Subject<any>();

  connect() {
    if (this.isConnected) return;

    const userDetails = JSON.parse(localStorage.getItem('userDetails') || '{}');
    if (!userDetails?.ip || !userDetails?.port) {
      console.error('❌ No user details found, cannot connect to WebSocket.');
      return;
    }

    const wsUrl = `ws://${userDetails.ip}:${userDetails.port}`;
    console.log(`🔌 Connecting to WebSocket server at: ${wsUrl}`);

    this.socket = new WebSocket(wsUrl);

    this.socket.onopen = () => {
      console.log('✅ WebSocket connection established.');
      this.isConnected = true;
    };

    this.socket.onclose = () => {
      console.warn('⚠️ WebSocket connection closed.');
      this.isConnected = false;
      setTimeout(() => this.connect(), 3000); // Retry after 3s
    };

    this.socket.onerror = (error) => {
      console.error('❌ WebSocket error:', error);
    };

    this.socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.messageSubject.next(data);
    };
  }

  sendMessage(message: any) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
    } else {
      console.warn('❌ WebSocket not open, message not sent.');
    }
  }

  receiveMessages(): Observable<any> {
    return this.messageSubject.asObservable();
  }
}
