import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatDialog } from '@angular/material/dialog';
import { ChatService } from '../services/chat-service.service';
import { WebsocketService } from '../services/websocket.service';
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
export class MainComponent implements OnInit {
  private chatService = inject(ChatService);
  private webSocketService = inject(WebsocketService);
  private router = inject(Router);
  private dialog = inject(MatDialog);

  userDetails = this.chatService.getUserDetails();
  users: { callSign: string; ip: string; port: string }[] = [];
  selectedUser: { callSign: string; ip: string; port: string } | null = null;
  messages: { sender: string; content: string }[] = [];
  newMessage = '';

  ngOnInit(): void {
    if (!this.userDetails?.name || !this.userDetails?.ip || !this.userDetails?.port) {
      console.error("User details are missing, redirecting to login.");
      this.router.navigate(['/login']);
      return;
    }

    // ✅ Ensure user details exist before registering
    this.webSocketService.sendMessageToPeer(this.userDetails.name, {
      type: 'register',
      callSign: this.userDetails.name,
      ip: this.userDetails.ip,
      port: this.userDetails.port,
    });

    // Listen for peer updates
    this.webSocketService.receiveMessages().subscribe((message) => {
      console.log("Received WebSocket message:", message);

      if (message.type === 'nodes') {
        this.users = message.nodes;
      }

      else if (message.type === 'userAdded') {
        console.log(`New user added: ${message.callSign}`);

        // Avoid duplicate entries
        if (!this.users.some(user => user.callSign === message.callSign)) {
          this.users.push(message);
          this.webSocketService.autoConnectToNewPeer(message);
        }
      }

      else if (message.type === 'userRemoved') {
        console.log(`User disconnected: ${message.callSign}`);
        this.users = this.users.filter(user => user.callSign !== message.callSign);
      }

      else if (message.type === 'message') {
        this.messages.push({ sender: message.sender, content: message.content });
      }
    });
  }



  selectUser(user: { callSign: string; ip: string; port: string }) {
    this.selectedUser = user;
    this.messages = [];
  }

  sendMessage() {
    if (this.newMessage.trim() && this.selectedUser) {
      const payload = {
        type: 'message',
        sender: this.userDetails?.name,
        content: this.newMessage,
        recipient: this.selectedUser.callSign,
      };
      this.webSocketService.sendMessageToPeer(this.selectedUser.callSign, payload);
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

        // Register new user and notify peers
        this.webSocketService.sendMessageToPeer(result.callSign, {
          type: 'addUser',
          callSign: result.callSign,
          ip: result.ip,
          port: result.port,
        });
      } else {
        console.warn("Invalid user data received from dialog.");
      }
    });
  }
}
