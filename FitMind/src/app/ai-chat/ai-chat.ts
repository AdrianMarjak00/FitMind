import { Component, OnInit, OnDestroy } from '@angular/core';
import { AiService, ChatMessage } from '../services/ai.service';
import { AuthService } from '../services/auth.service';
import { BackendStatusService } from '../services/backend-status.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { User } from '@angular/fire/auth';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-ai-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ai-chat.html',
  styleUrls: ['./ai-chat.scss']
})
export class AiChatComponent implements OnInit, OnDestroy {
  currentUser: User | null = null;
  userId = '';
  message = '';
  isLoading = false;
  savedEntries: string[] = [];
  private userSubscription?: Subscription;

  backendRunning = true;

  constructor(
    public aiService: AiService,
    private authService: AuthService,
    private backendStatus: BackendStatusService
  ) {}

  ngOnInit(): void {
    // Skontroluj backend status
    this.backendStatus.checkBackendStatus().subscribe(isRunning => {
      this.backendRunning = isRunning;
      if (!isRunning) {
        console.warn('⚠️ Backend server nebeží na http://localhost:8000');
      }
    });

    this.userSubscription = this.authService.getCurrentUser().subscribe(user => {
      this.currentUser = user;
      this.userId = user?.uid || '';
      if (!this.userId) {
        console.warn('⚠️ Používateľ nie je prihlásený');
      }
    });
  }

  ngOnDestroy(): void {
    this.userSubscription?.unsubscribe();
  }

  sendMessage(): void {
    if (!this.message.trim() || !this.userId) {
      if (!this.userId) {
        alert('Prosím prihláste sa pre použitie AI coacha');
      }
      return;
    }

    if (!this.backendRunning) {
      alert('⚠️ Backend server nebeží!\n\nProsím spusti backend:\n\n1. Otvor terminál\n2. cd backend\n3. python main.py\n\nAlebo použij PM2:\npm2 start ecosystem.config.js');
      return;
    }

    this.isLoading = true;
    this.savedEntries = [];
    
    this.aiService.sendMessage(this.userId, this.message.trim()).subscribe({
      next: (response) => {
        this.message = '';
        if (response.saved_entries && response.saved_entries.length > 0) {
          this.savedEntries = response.saved_entries;
          // Skryť notifikácie po 5 sekundách
          setTimeout(() => {
            this.savedEntries = [];
          }, 5000);
        }
      },
      error: (err) => {
        console.error('AI chyba:', err);
        this.isLoading = false;
        
        // Lepšia error handling
        if (err.status === 0 || err.message?.includes('ERR_CONNECTION_REFUSED')) {
          alert('⚠️ Backend server nebeží!\n\nProsím spusti backend:\ncd backend\npython main.py\n\nAlebo použij PM2:\npm2 start ecosystem.config.js');
        } else if (err.status === 500) {
          alert('❌ Chyba na serveri. Skontroluj backend logy.');
        } else {
          alert(`❌ Chyba: ${err.message || 'Neznáma chyba'}`);
        }
      },
      complete: () => this.isLoading = false
    });
  }

  clearChat(): void {
    this.aiService.clearChat();
    this.savedEntries = [];
  }
}
