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
      this.router.navigate(['/chat']);
    } else {
      console.log("⚠️ No user details found. Redirecting to login.");
      this.router.navigate(['/login']);
    }
  }  
}
