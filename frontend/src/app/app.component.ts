import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';

import { ChatService } from './services/chat-service.service';
import { WebsocketService } from './services/websocket.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit {
  private chatService = inject(ChatService);
  private webSocketService = inject(WebsocketService);
  private router = inject(Router);

  userDetails = this.chatService.getUserDetails();

  ngOnInit(): void {
    if (this.userDetails?.name && this.userDetails?.ip) {
      console.log(`🔄 Restoring WebSocket connection for ${this.userDetails.name}`);
      
      this.webSocketService.connect();
  
      const checkConnection = setInterval(() => {
        if (this.webSocketService['isConnected']) {
          clearInterval(checkConnection);
  
          this.webSocketService.sendMessage({
            type: 'register',
            callSign: this.userDetails?.name,
            ip: this.userDetails?.ip,
            port: this.userDetails?.port
          });
  
          console.log(`✅ WebSocket re-registered for ${this.userDetails?.name}`);
          this.router.navigate(['/chat']);
        }
      }, 500);
    } else {
      console.log("⚠️ No user details found. Redirecting to login.");
      this.router.navigate(['/login']);
    }
  }  
}
