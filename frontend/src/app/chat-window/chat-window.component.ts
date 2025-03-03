import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';

import { MatListModule } from '@angular/material/list';
import { ChatService } from '../services/chat-service.service';

@Component({
  selector: 'app-chat-window',
  imports: [ CommonModule, MatListModule ],
  templateUrl: './chat-window.component.html',
  styleUrl: './chat-window.component.scss'
})
export class ChatWindowComponent {
  private chatService: ChatService = inject(ChatService);
  
  selectedUser = this.chatService.selectedUser;
  chatHistory = this.chatService.chatHistory;

  get messages() {
    return this.selectedUser() ? this.chatHistory()[this.selectedUser()!] : [];
  }
}
