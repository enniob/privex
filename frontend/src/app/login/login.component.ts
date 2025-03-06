import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { CommonModule } from '@angular/common';
import { ChatService } from '../services/chat-service.service';
import { WebsocketService } from '../services/websocket.service';

@Component({
  selector: 'app-login',
  imports: [ CommonModule, ReactiveFormsModule, MatInputModule, MatButtonModule, MatCardModule, MatFormFieldModule ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent {
  loginForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private chatService: ChatService,
    private webSocketService: WebsocketService
  ) {
    this.loginForm = this.fb.group({
      name: ['', Validators.required],
      ip: [
        '',
        [
          Validators.required,
          Validators.pattern('^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$'),
        ],
      ],
      port: ['4300', [Validators.required, Validators.min(1), Validators.max(65535)]],
    });
  }

  onSubmit() {
    if (this.loginForm.valid) {
      const { name, ip, port } = this.loginForm.value;
      this.chatService.setUserDetails(name, ip, port);
  
      console.log(`🚀 Logging in as ${name} (${ip}:${port})`);
  
      this.webSocketService.connect();
  
      const checkConnection = setInterval(() => {
        if (this.webSocketService['isConnected']) {
          clearInterval(checkConnection);
  
          this.webSocketService.sendMessage({
            type: 'login',
            callSign: name,
            ip: ip,
            port: port
          });
  
          console.log(`✅ User ${name} registered on WebSocket server`);
  
          this.router.navigate(['/chat']);
        }
      }, 500);
    }
  }  
}
