import { Injectable, signal, inject } from '@angular/core';
import { WebsocketService } from './websocket.service';

interface User {
  callSign: string;
  ip: string;
  port: string;
  address: string;
  status: 'online' | 'offline';
}

@Injectable({
  providedIn: 'root',
})
export class ChatService {
  private webSocketService = inject(WebsocketService);

  selectedUser = signal<string | null>(null);
  userDetails = signal<{ name: string; ip: string; port: string } | null>(null);
  callSign = signal<string>('Anonymous');
  chatHistory = signal<{ [key: string]: { sender: string; content: string; timestamp: Date }[] }>({});
  users = signal<User[]>([]);

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

    this.users.update((users) => [
      ...users,
      { callSign: name, ip, port, address: `ws://${ip}:${port}`, status: 'online' },
    ]);
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
      case 'nodeConnected':
        this.users.update((users) => [
          ...users,
          { address: message.address, callSign: message.address, ip: '', port: '', status: 'offline' },
        ]);
        break

      case 'message':
        this.updateChatHistory(message);
        break;

      case 'peerConfirmed':
        this.updateUserList({ callSign: message.peerCallSign, ip: message.peerIp, port: message.peerPort });
        this.users.update((users) =>
          users.map((user) =>
              user.address === `ws://${message.peerIp}:${message.peerPort}`
                ? { ...user, callSign: message.peerCallSign, ip: message.peerIp, port: message.peerPort, status: 'online' }
                : user
        ));
        break;

      case 'messageReceived':
        this.updateChatHistory({sender: message.sender, content: message.content, timestamp: new Date() });
        break;

      case 'online':
        this.users.update((users) =>
          users.map((user) => (user.callSign === message.callSign ? { ...user, status: 'online' } : user))
        );
        break;
      
      case 'offline':
        this.users.update((users) =>
          users.map((user) => (user.callSign === message.callSign ? { ...user, status: 'offline' } : user))
        );
        break;
      
      default:
        console.warn(`Unhandled message type: ${message?.type}`);
    }
  }

  private updateChatHistory(message: { sender: string; content: string; timestamp: Date }) {
    const history = this.chatHistory();
    const sender = message.sender;

    if (history[sender]) {
      history[sender].push({ sender: sender, content: message.content, timestamp: message.timestamp });
    } else {
      history[sender] = [{ sender: sender, content: message.content, timestamp: message.timestamp }];
    }
    this.chatHistory.set({ ...history });
  }

  private updateUserList(message: { callSign: string; ip: string; port: string }) {
    const existingUser = this.users().find((user) => user.callSign === message.callSign);
    if (!existingUser) {
      this.users.update((users) => [
        ...users,
        {
          callSign: message.callSign,
          ip: message.ip,
          port: message.port,
          address: `ws://${message.ip}:${message.port}`,
          status: 'online',
        },
      ]);
      console.log(`✅ Added ${message.callSign} to the user list.`);
    } else {
      console.warn(`⚠️ User ${message.callSign} already exists in the list.`);
    }
  }
}
