import { Component } from '@angular/core';
import { AiService, ChatMessage } from '../services/ai.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-ai-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ai-chat.html',
  styleUrls: ['./ai-chat.scss']
})
export class AiChatComponent {
  userId = 'jan'; 
  message = '';
  isLoading = false;

  constructor(public aiService: AiService) {}

  sendMessage(): void {
    if (this.message.trim()) {
      this.isLoading = true;
      this.aiService.sendMessage(this.userId, this.message.trim()).subscribe({
        next: () => this.message = '',
        error: (err) => {
          console.error('AI chyba:', err);
          this.isLoading = false;
        },
        complete: () => this.isLoading = false
      });
    }
  }

  clearChat(): void {
    this.aiService.clearChat();
  }
}
