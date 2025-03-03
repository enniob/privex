import { Injectable } from '@angular/core';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';
import { Observable, catchError, of } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class WebsocketService {
  private socket$: WebSocketSubject<any>;

  constructor() {
    // Connect to the WebSocket server
    this.socket$ = webSocket('ws://localhost:4300'); // Replace with your WebSocket server URL

    // Log connection status
    this.socket$.subscribe({
      next: () => console.log('WebSocket connection established'),
      error: (error) => console.error('WebSocket connection error:', error),
      complete: () => console.log('WebSocket connection closed'),
    });
  }

  // Send a message to the server
  sendMessage(message: any) {
    this.socket$.next(message);
  }

  // Listen for incoming messages
  receiveMessages(): Observable<any> {
    return this.socket$.asObservable().pipe(
      catchError((error) => {
        console.error('WebSocket error:', error);
        return of(null); // Return an empty observable to keep the stream alive
      })
    );
  }

  // Close the WebSocket connection
  closeConnection() {
    this.socket$.complete();
  }
}