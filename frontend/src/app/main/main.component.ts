import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatDialog } from '@angular/material/dialog';
import { ChatService } from '../services/chat-service.service';
import { Router } from '@angular/router';
import { AddUserDialogComponent } from '../add-user-dialog/add-user-dialog.component';

@Component({
  selector: 'app-chat',
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatListModule,
  ],
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.scss'],
})
export class MainComponent {
  private chatService = inject(ChatService);
  private router = inject(Router);
  private dialog = inject(MatDialog);

  userDetails = this.chatService.userDetails;
  users = this.chatService.users;
  chatHistory = this.chatService.chatHistory;
  selectedUser = this.chatService.selectedUser;

  newMessage = '';

  constructor() {
    if (!this.userDetails()?.name || !this.userDetails()?.ip || !this.userDetails()?.port) {
      console.error("⚠️ User details are missing, redirecting to login.");
      this.router.navigate(['/login']);
      return;
    }
  }

  selectUser(user: { callSign: string; ip: string; port: string }) {
    this.chatService.selectUser(user.callSign);
  }

  sendMessage() {
    if (this.newMessage.trim() && this.selectedUser()) {
      const sender = this.userDetails()?.name || 'Anonymous';
      const timestamp = new Date();
      const payload = {
        type: 'message',
        sender: sender,
        content: this.newMessage,
        recipientCallSign: this.selectedUser(),
      };

      this.chatService.sendMessage(payload); // Send via WebSocket

      // Add the message to chatHistory (your own message)
      this.chatService.chatHistory.update((history: any) => {
        const userHistory = history[this.selectedUser()!] || [];
        return {
          ...history,
          [this.selectedUser()!]: [...userHistory, { sender: sender, content: this.newMessage, timestamp: timestamp }],
        };
      });

      this.newMessage = '';
    }
  }

  openAddUserDialog() {
    const dialogRef = this.dialog.open(AddUserDialogComponent, {
      width: '400px',
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result && result.callSign && result.ip && result.port) {
        console.log(`Adding new user: ${result.callSign} (${result.ip}:${result.port})`);
        this.chatService.openAddUser(result);
      } else {
        console.warn("Invalid user data received from dialog.");
      }
    });
  }

  getMessagesForSelectedUser(): { sender: string; content: string; timestamp: Date }[] {
    const selectedUser = this.selectedUser();
    if (selectedUser) {
      return this.chatHistory()[selectedUser] || [];
    }
    return [];
  }
}
