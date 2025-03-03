import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatWindowComponent } from './chat-window/chat-window.component';
import { MessageInputComponent } from './message-input/message-input.component';
import { UserListComponent } from './user-list/user-list.component';

import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

import { AddUserDialogComponent } from './add-user-dialog/add-user-dialog.component';
import { SetupDialogComponent } from './setup-dialog/setup-dialog.component';
import { ChatService } from './services/chat-service.service';
import { WebsocketService } from './services/websocket.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [ CommonModule, ChatWindowComponent, MessageInputComponent, UserListComponent, MatIconModule ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit {
  private chatService = inject(ChatService);
  private dialog = inject(MatDialog);
  private webSocketService = inject(WebsocketService);

  ngOnInit(): void {
    // Initialize WebSocket connection
    this.webSocketService.receiveMessages().subscribe({
      next: (message) => {
        console.log('Received message:', message);
        // Handle incoming messages here
      },
      error: (error) => {
        console.error('WebSocket error:', error);
      },
      complete: () => {
        console.log('WebSocket connection closed');
      },
    });

    this.registerUser();
  }

  registerUser() {
    const callSign = this.chatService.callSign(); // Get the current user's callSign
    if (callSign) {
      const payload = {
        type: 'register',
        callSign: callSign,
        ip: '0.0.0.0',
        port: 4300,
      };
      try {
        this.webSocketService.sendMessage(payload); // Send registration message to the server
      } catch (error) {
        console.error('Failed to send registration message:', error);
      }
    }
  }

  async openSetupDialog() {
    const dialogRef = this.dialog.open(SetupDialogComponent, {
      data: { ipAddress: '0.0.0.0' },
    });

    dialogRef.afterClosed().subscribe((callSign) => {
      if (callSign) {
        this.chatService.callSign.set(callSign);
        this.registerUser(); // Register the user after setting the callSign
      }
    });
  }

  openAddUserDialog() {
    const dialogRef = this.dialog.open(AddUserDialogComponent, {
      width: '400px',
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.addUser(result); // Add the user with the provided details
      }
    });
  }

  addUser(user: { callSign: string; ip: string; port: string }) {
    const payload = {
      type: 'addUser',
      callSign: user.callSign,
      ip: user.ip,
      port: user.port,
    };
    this.webSocketService.sendMessage(payload); // Send the user details to the server
  }
}
