import { Component, OnInit, OnDestroy } from '@angular/core';
import { AiService, ChatMessage, WeeklyReport, GoalProgress, Conversation } from '../../services/ai.service';
import { AuthService } from '../../services/auth.service';
import { BackendStatusService } from '../../services/backend-status.service';
import { PaymentService, SubscriptionStatus } from '../../services/payment.service';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { User } from '@angular/fire/auth';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-ai-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe, RouterModule],
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
  private conversationsSubscription?: Subscription;
  private activeConvSubscription?: Subscription;

  backendRunning = true;
  showHistory = false;

  // Conversations
  conversations: Conversation[] = [];
  activeConversationId: string | null = null;

  // Insights panel
  showInsights = false;
  activeTab: 'recommendations' | 'weekly' | 'goals' = 'recommendations';
  loadingInsights = false;

  recommendations: string[] = [];
  weeklyReport: WeeklyReport | null = null;
  goalProgress: GoalProgress | null = null;

  // Premium / Message limits
  readonly FREE_DAILY_LIMIT = 10;
  isPremium = false;
  messagesUsedToday = 0;
  subscription: SubscriptionStatus | null = null;

  constructor(
    public aiService: AiService,
    private authService: AuthService,
    private backendStatus: BackendStatusService,
    private paymentService: PaymentService
  ) {}

  ngOnInit(): void {
    this.backendStatus.checkBackendStatus().subscribe(isRunning => {
      this.backendRunning = isRunning;
    });

    // Subscribe to conversations list
    this.conversationsSubscription = this.aiService.conversations$.subscribe(convs => {
      this.conversations = convs;
    });

    // Subscribe to active conversation ID
    this.activeConvSubscription = this.aiService.activeConversationId$.subscribe(id => {
      this.activeConversationId = id;
    });

    this.userSubscription = this.authService.getCurrentUser().subscribe(user => {
      this.currentUser = user;
      this.userId = user?.uid || '';
      if (this.userId) {
        // Načítaj konverzácie pri inicializácii
        this.aiService.loadConversations(this.userId);
        this.loadRecommendations();
        this.loadSubscriptionStatus();
        this.loadDailyMessageCount();
      }
    });
  }

  // === PREMIUM FUNKCIE ===

  loadSubscriptionStatus(): void {
    if (!this.userId) return;
    this.paymentService.getPaymentStatus(this.userId).subscribe({
      next: (response) => {
        this.subscription = response.subscription;
        this.isPremium = this.paymentService.hasPaidPlan(response.subscription);
      },
      error: () => {
        this.isPremium = false;
      }
    });
  }

  loadDailyMessageCount(): void {
    const today = new Date().toISOString().split('T')[0];
    const storageKey = `ai_messages_${this.userId}_${today}`;
    const stored = localStorage.getItem(storageKey);
    this.messagesUsedToday = stored ? parseInt(stored, 10) : 0;
  }

  incrementMessageCount(): void {
    const today = new Date().toISOString().split('T')[0];
    const storageKey = `ai_messages_${this.userId}_${today}`;
    this.messagesUsedToday++;
    localStorage.setItem(storageKey, this.messagesUsedToday.toString());
  }

  get remainingMessages(): number {
    if (this.isPremium) return Infinity;
    return Math.max(0, this.FREE_DAILY_LIMIT - this.messagesUsedToday);
  }

  get canSendMessage(): boolean {
    return this.isPremium || this.messagesUsedToday < this.FREE_DAILY_LIMIT;
  }

  ngOnDestroy(): void {
    this.userSubscription?.unsubscribe();
    this.conversationsSubscription?.unsubscribe();
    this.activeConvSubscription?.unsubscribe();
  }

  sendMessage(): void {
    if (!this.message.trim() || !this.userId) return;

    if (!this.backendRunning) {
      alert('⚠️ Backend server nebeží!');
      return;
    }

    // Kontrola limitu správ pre free používateľov
    if (!this.canSendMessage) {
      return; // UI zobrazí upgrade banner
    }

    this.isLoading = true;
    this.savedEntries = [];

    this.aiService.sendMessage(this.userId, this.message.trim()).subscribe({
      next: (response) => {
        this.message = '';
        this.incrementMessageCount(); // Zvýš počítadlo správ
        if (response.saved_entries && response.saved_entries.length > 0) {
          this.savedEntries = response.saved_entries;
          setTimeout(() => { if (this.showInsights) this.refreshCurrentTab(); }, 1000);
          setTimeout(() => { this.savedEntries = []; }, 5000);
        }
      },
      error: () => { this.isLoading = false; },
      complete: () => this.isLoading = false
    });
  }

  clearChat(): void {
    if (!this.activeConversationId) return;
    if (confirm('Vymazať túto konverzáciu?')) {
      this.aiService.deleteConversation(this.userId, this.activeConversationId).subscribe({
        next: () => { this.savedEntries = []; },
        error: () => { /* Tiché zlyhanie */ }
      });
    }
  }

  // === CONVERSATION MANAGEMENT ===

  onNewConversation(): void {
    if (!this.userId) return;
    this.aiService.createConversation(this.userId).subscribe({
      error: () => { /* Tiché zlyhanie */ }
    });
  }

  onConversationSelect(conversationId: string): void {
    if (!this.userId || conversationId === this.activeConversationId) return;
    this.aiService.switchConversation(this.userId, conversationId);
    // Na mobile zavrieme sidebar
    this.showHistory = false;
  }

  onDeleteConversation(event: Event, conversationId: string): void {
    event.stopPropagation();
    if (!this.userId) return;
    if (confirm('Vymazať túto konverzáciu?')) {
      this.aiService.deleteConversation(this.userId, conversationId).subscribe({
        error: () => { /* Tiché zlyhanie */ }
      });
    }
  }

  toggleInsights(): void {
    this.showInsights = !this.showInsights;
    if (this.showInsights && !this.recommendations.length) {
      this.loadRecommendations();
    }
  }

  refreshCurrentTab(): void {
    if (this.activeTab === 'recommendations') this.loadRecommendations();
    else if (this.activeTab === 'weekly') this.loadWeeklyReport();
    else if (this.activeTab === 'goals') this.loadGoalProgress();
  }

  loadRecommendations(): void {
    if (!this.userId) return;
    this.loadingInsights = true;
    this.aiService.getPersonalizedRecommendations(this.userId).subscribe({
      next: (res) => { this.recommendations = res.recommendations; this.loadingInsights = false; },
      error: () => this.loadingInsights = false
    });
  }

  loadWeeklyReport(): void {
    if (!this.userId) return;
    this.loadingInsights = true;
    this.aiService.getWeeklyReport(this.userId).subscribe({
      next: (res) => { this.weeklyReport = res.report; this.loadingInsights = false; },
      error: () => this.loadingInsights = false
    });
  }

  loadGoalProgress(): void {
    if (!this.userId) return;
    this.loadingInsights = true;
    this.aiService.getGoalProgress(this.userId).subscribe({
      next: (res) => { this.goalProgress = res; this.loadingInsights = false; },
      error: () => this.loadingInsights = false
    });
  }
}