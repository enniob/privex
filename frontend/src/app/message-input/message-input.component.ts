import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { ChatService } from '../services/chat-service.service';

@Component({
  selector: 'app-message-input',
  imports: [ CommonModule, FormsModule, MatInputModule, MatButtonModule ],
  templateUrl: './message-input.component.html',
  styleUrl: './message-input.component.scss'
})
export class MessageInputComponent {
  private chatService: ChatService = inject(ChatService);

  selectedUser = this.chatService.selectedUser;
  message: string = '';

  sendMessage() {
    if (this.message.trim() && this.selectedUser()) {
      this.chatService.sendMessage(this.selectedUser()!, this.message);
      this.message = '';
    }
  }  
}
