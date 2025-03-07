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
  users = signal<{ callSign: string; ip: string; port: string }[]>([]);

  constructor() {
    this.webSocketService.receiveMessages().subscribe((message: any) => {
      this.handleIncomingMessage(message);
    });
  }

  selectUser(user: string) {
    this.selectedUser.set(user);
  }

  setUserDetails(name: string, ip: string, port: string) {
    const userData = { name, ip, port };
    this.userDetails.set(userData);
    this.callSign.set(name);
    this.users.update(users => [...users, { callSign: name, ip, port }]);
  }

  getUserDetails() {
    return this.userDetails();
  }

  getUsers() {
    return this.users();
  }

  sendMessage(payload: any) {
    this.webSocketService.sendMessage(payload);
  }

  openAddUser(details: { callSign: string; ip: string; port: string }) {
    this.webSocketService.sendMessage({
      type: 'addUser',
      peerCallSign: details.callSign,
      peerIp: details.ip,
      peerPort: details.port
    });
    this.updateUserList(details);
  }
  
  private handleIncomingMessage(message: any) {
    switch(message.type) {
      case 'message':
        this.updateChatHistory(message);
        break;
      case 'peerConfirmed':
        this.updateUserList({ callSign: message.peerCallSign, ip: message.peerIp, port: message.peerPort });
        break;
      default:
        console.warn(`Unhandled message type: ${message?.type}`);
    }
  }

  private updateChatHistory(message: any) {
    const history = this.chatHistory();
    const sender = message.sender;

    if (history[sender]) {
      history[sender].push({ sender: sender, content: message.content });
    } else {
      history[sender] = [{ sender: sender, content: message.content }];
    }
    this.chatHistory.set({ ...history });
  }

  private updateUserList(message: { callSign: string; ip: string; port: string }) {
    const existingUser = this.users().find(user => user.callSign === message.callSign);
    if (!existingUser) {
      this.users.update(users => [...users, { callSign: message.callSign, ip: message.ip, port: message.port }]);
      console.log(`✅ Added ${message.callSign} to the user list.`);
    } else {
      console.warn(`⚠️ User ${message.callSign} already exists in the list.`);
    }
  }
}
