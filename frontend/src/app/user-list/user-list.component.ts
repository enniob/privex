import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatListModule } from '@angular/material/list';
import { ChatService } from '../services/chat-service.service';
import { WebsocketService } from '../services/websocket.service';

@Component({
  selector: 'app-user-list',
  imports: [CommonModule, MatListModule],
  templateUrl: './user-list.component.html',
  styleUrls: ['./user-list.component.scss'],
})
export class UserListComponent {
  private chatService = inject(ChatService);
  private webSocketService = inject(WebsocketService);

  users: { callSign: string; ip: string; port: string }[] = [];

  constructor() {
    // Listen for new users added to the chat
    this.webSocketService.receiveMessages().subscribe((message) => {
      if (message.type === 'userAdded') {
        this.users.push(message); // Add the new user to the list
      }
    });
  }

  onUserClick(user: string) {
    this.chatService.selectUser(user); // Select the user
  }
}