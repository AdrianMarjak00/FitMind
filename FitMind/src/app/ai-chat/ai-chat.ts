import { Component, OnInit, OnDestroy } from '@angular/core';
import { AiService, ChatMessage, WeeklyReport, GoalProgress } from '../services/ai.service';
import { AuthService } from '../services/auth.service';
import { BackendStatusService } from '../services/backend-status.service';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { User } from '@angular/fire/auth';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-ai-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe],
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

  // Nové: Insights panel
  showInsights = false;
  activeTab: 'recommendations' | 'weekly' | 'goals' = 'recommendations';
  loadingInsights = false;
  
  recommendations: string[] = [];
  weeklyReport: WeeklyReport | null = null;
  goalProgress: GoalProgress | null = null;

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
      } else {
        // Automaticky načítaj odporúčania pri prihlásení
        this.loadRecommendations();
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
          
          // Po uložení dát automaticky aktualizuj insights
          setTimeout(() => {
            if (this.showInsights) {
              this.refreshCurrentTab();
            }
          }, 1000);
          
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
    if (confirm('Vymazať celú konverzáciu vrátane histórie?')) {
      this.aiService.clearChatHistory(this.userId).subscribe({
        next: () => {
          this.aiService.clearChat();
          this.savedEntries = [];
          console.log('Chat história vymazaná');
        },
        error: (err) => {
          console.error('Chyba pri mazaní histórie:', err);
          // Aj tak vyčisti lokálny chat
          this.aiService.clearChat();
          this.savedEntries = [];
        }
      });
    }
  }

  // === INSIGHTS PANEL ===

  toggleInsights(): void {
    this.showInsights = !this.showInsights;
    if (this.showInsights && !this.recommendations.length) {
      this.loadRecommendations();
    }
  }

  refreshCurrentTab(): void {
    switch (this.activeTab) {
      case 'recommendations':
        this.loadRecommendations();
        break;
      case 'weekly':
        this.loadWeeklyReport();
        break;
      case 'goals':
        this.loadGoalProgress();
        break;
    }
  }

  loadRecommendations(): void {
    if (!this.userId) return;
    
    this.loadingInsights = true;
    this.aiService.getPersonalizedRecommendations(this.userId).subscribe({
      next: (response) => {
        this.recommendations = response.recommendations;
        this.loadingInsights = false;
      },
      error: (err) => {
        console.error('Chyba pri načítaní odporúčaní:', err);
        this.loadingInsights = false;
      }
    });
  }

  loadWeeklyReport(): void {
    if (!this.userId) return;
    
    this.loadingInsights = true;
    this.aiService.getWeeklyReport(this.userId).subscribe({
      next: (response) => {
        this.weeklyReport = response.report;
        this.loadingInsights = false;
      },
      error: (err) => {
        console.error('Chyba pri načítaní týždenného reportu:', err);
        this.loadingInsights = false;
      }
    });
  }

  loadGoalProgress(): void {
    if (!this.userId) return;
    
    this.loadingInsights = true;
    this.aiService.getGoalProgress(this.userId).subscribe({
      next: (response) => {
        this.goalProgress = response;
        this.loadingInsights = false;
      },
      error: (err) => {
        console.error('Chyba pri načítaní pokroku k cieľom:', err);
        this.loadingInsights = false;
      }
    });
  }
}
