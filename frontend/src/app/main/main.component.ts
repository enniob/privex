import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
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
  private changeDetectorRef = inject(ChangeDetectorRef);

  userDetails = this.chatService.getUserDetails();
  users: { callSign: string; ip: string; port: string }[] = [];
  selectedUser: { callSign: string; ip: string; port: string } | null = null;
  messages: { sender: string; content: string }[] = [];
  newMessage = '';

  ngOnInit(): void {
    if (!this.userDetails?.name || !this.userDetails?.ip || !this.userDetails?.port) {
      console.error("⚠️ User details are missing, redirecting to login.");
      this.router.navigate(['/login']);
      return;
    }
  
    console.log(`🚀 Registering user: ${this.userDetails.name}`);
    
    // ✅ Ensure the user sees themselves on the UI after registration
    this.users = [...this.users, {
      callSign: this.userDetails.name,
      ip: this.userDetails.ip,
      port: this.userDetails.port
    }];
    this.changeDetectorRef.detectChanges();
  
    // ✅ Listen for peer updates from the WebSocket server
    this.webSocketService.receiveMessages().subscribe((message) => {
      console.log("📩 Received WebSocket message:", message);
  
      if (message.type === 'nodes') {
        console.log("🔍 Updating full peer list");
        this.users = message.nodes;
        this.changeDetectorRef.detectChanges(); // ✅ Force UI update
      }
  
      else if (message.type === 'userAdded' || message.type === 'userAddedBy') {
        console.log(`🆕 New user added: ${message.callSign} (${message.ip}:${message.port})`);
  
        const existingUser = this.users.find(user => user.callSign === message.callSign);
        if (!existingUser) {
            this.users = [...this.users, {
                callSign: message.callSign,
                ip: message.ip,
                port: message.port
            }];
            console.log(`✅ Added ${message.callSign} to the user list.`);
            this.changeDetectorRef.detectChanges(); // ✅ Force UI update
        } else {
            console.warn(`⚠️ User ${message.callSign} already exists in the list.`);
        }
    
        // ✅ Debugging: Check if UI is receiving the event
        console.log(`👀 Current Users List:`, this.users);
      }
  
      else if (message.type === 'userRemoved') {
        console.log(`❌ User disconnected: ${message.callSign}`);
        this.users = this.users.filter(user => user.callSign !== message.callSign);
        this.changeDetectorRef.detectChanges(); // ✅ Force UI update
      }
  
      else if (message.type === 'message') {
        console.log(`💬 Message received: ${message.content}`);
        this.messages.push({ sender: message.sender, content: message.content });
        this.changeDetectorRef.detectChanges(); // ✅ Force UI update
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
      this.webSocketService.sendMessage(payload);
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

        // ✅ Now we only send the addUser request to the local server, not the peer directly
        this.webSocketService.sendMessage({
          type: 'addUser',
          callSign: result.callSign,
          ip: result.ip,
          port: result.port,
          senderCallSign: this.userDetails?.name,
          senderIp: this.userDetails?.ip,
          senderPort: this.userDetails?.port
        });
      } else {
        console.warn("Invalid user data received from dialog.");
      }
    });
  }
}
