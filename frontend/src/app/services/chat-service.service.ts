import { Injectable, signal, inject } from '@angular/core';
import { WebsocketService } from './websocket.service';

@Injectable({
  providedIn: 'root',
})
export class ChatService {
  private webSocketService = inject(WebsocketService);

  selectedUser = signal<string | null>(null);
  userDetails = signal<{ name: string; ip: string; port: string } | null>(null);
  callSign = signal<string>('Anonymous');
  chatHistory = signal<{ [key: string]: { sender: string; content: string }[] }>({});

  constructor() {
    this.webSocketService.receiveMessages().subscribe((message: any) => {
      this.handleIncomingMessage(message);
    });

    // Restore user details from localStorage
    const savedUser = JSON.parse(localStorage.getItem('userDetails') || 'null');
    if (savedUser) {
      this.userDetails.set(savedUser);
      this.callSign.set(savedUser.name);
    }
  }

  selectUser(user: string) {
    this.selectedUser.set(user);
  }

  setUserDetails(name: string, ip: string, port: string) {
    const userData = { name, ip, port };
    this.userDetails.set(userData);
    this.callSign.set(name);
    localStorage.setItem('userDetails', JSON.stringify(userData));
  }

  getUserDetails() {
    return this.userDetails(); // ✅ Fixed: Now correctly returns the object
  }

  sendMessage(user: string, message: string) {
    if (!this.webSocketService) {
      console.error('❌ WebSocket service is not initialized.');
      return;
    }

    const payload = {
      type: 'message',
      sender: this.callSign(),
      recipient: user,
      content: message,
    };

    this.webSocketService.sendMessage(payload);

    const history = this.chatHistory();
    if (history[user]) {
      history[user].push({ sender: this.callSign(), content: message });
    } else {
      history[user] = [{ sender: this.callSign(), content: message }];
    }
    this.chatHistory.set({ ...history });
  }

  private handleIncomingMessage(message: any) {
    if (message?.type === 'message') {
      const history = this.chatHistory();
      const sender = message.sender;

      if (history[sender]) {
        history[sender].push({ sender: sender, content: message.content });
      } else {
        history[sender] = [{ sender: sender, content: message.content }];
      }
      this.chatHistory.set({ ...history });
    }
  }
}
