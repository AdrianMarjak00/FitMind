import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { AiService, WeeklyReport, GoalProgress, Conversation } from '../../services/ai.service';
import { AuthService } from '../../services/auth.service';
import { LlmService, LlmState } from '../../services/llm.service';
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
export class AiChatComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;
  currentUser: User | null = null;
  userId = '';
  message = '';
  isLoading = false;
  savedEntries: string[] = [];
  sendError = '';
  private userSubscription?: Subscription;
  private conversationsSubscription?: Subscription;
  private activeConvSubscription?: Subscription;
  private llmSubscription?: Subscription;
  private messagesSubscription?: Subscription;
  private lastMessageCount = 0;

  showHistory = false;

  // Voliteľný jazykový model v zariadení
  llmState: LlmState = { status: 'off', progress: 0, detail: '' };
  showLlmInfo = false;

  // Rýchle návrhy pre prázdny chat
  readonly quickPrompts = [
    'Koľko mi dnes ostáva kalórií?',
    'Čo si mám dať na večeru?',
    'Zostav mi tréningový plán',
    'Ako sa mi darilo tento týždeň?',
    'Čo všetko vieš?'
  ];

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

  // Premium / limity správ (aktívne len keď sú zapnuté platby)
  readonly FREE_DAILY_LIMIT = 10;
  isPremium = true;
  messagesUsedToday = 0;
  subscription: SubscriptionStatus | null = null;

  constructor(
    public aiService: AiService,
    private authService: AuthService,
    public llm: LlmService,
    private paymentService: PaymentService
  ) { }

  private scrollToBottom(): void {
    try {
      if (this.messagesContainer) {
        const el = this.messagesContainer.nativeElement;
        el.scrollTop = el.scrollHeight;
      }
    } catch (err) { }
  }

  formatMessage(content: string): string {
    if (!content) return '';

    let formatted = content
      // Preserve line breaks
      .replace(/\n/g, '<br>')
      // Bold text **text**
      .replace(/\*\*([^\*]+)\*\*/g, '<strong>$1</strong>')
      // Highlight calories with color
      .replace(/(\d+)\s*kcal/gi, '<span class="highlight-calories">$1 kcal</span>')
      // Highlight numbers with units (g, kg, cm, min, etc.)
      .replace(/(\d+)\s*(g|kg|cm|min|hodín|rokov)\b/gi, '<span class="highlight-number">$1 $2</span>')
      // Highlight percentages and standalone numbers
      .replace(/(\d+)%/g, '<span class="highlight-number">$1%</span>')
      .replace(/(\d+)\/(\d+)/g, '<span class="highlight-number">$1/$2</span>')
      // Make bullet points prettier
      .replace(/•/g, '<span class="bullet">•</span>')
      .replace(/\*\s/g, '<span class="bullet">•</span> ')
      // Emoji spacing
      .replace(/([\u{1F300}-\u{1F9FF}])/gu, '<span class="emoji">$1</span>');

    return formatted;
  }

  ngAfterViewChecked(): void {
    // Skroluj len keď pribudla správa – inak by sa nedalo čítať históriu
    if (this.pendingScroll) {
      this.pendingScroll = false;
      this.scrollToBottom();
    }
  }
  private pendingScroll = false;

  ngOnInit(): void {
    this.llmSubscription = this.llm.state$.subscribe(state => this.llmState = state);
    // Ak si používateľ model už raz zapol, načítaj ho z cache prehliadača
    if (this.llm.wasEnabled() && this.llm.isSupported()) {
      this.llm.enable();
    }

    this.messagesSubscription = this.aiService.messages$.subscribe(messages => {
      if (messages.length !== this.lastMessageCount) {
        this.lastMessageCount = messages.length;
        this.pendingScroll = true;
      }
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
        this.aiService.loadConversations(this.userId);
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
        this.isPremium = !this.paymentService.enabled;
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
    this.llmSubscription?.unsubscribe();
    this.messagesSubscription?.unsubscribe();
  }

  // === MODEL V ZARIADENÍ ===

  toggleLlm(): void {
    if (this.llmState.status === 'ready' || this.llmState.status === 'loading') {
      this.llm.disable();
    } else {
      this.llm.enable();
    }
  }

  usePrompt(prompt: string): void {
    if (this.isLoading) return;
    this.message = prompt;
    this.sendMessage();
  }

  sendMessage(): void {
    if (!this.message.trim() || !this.userId || this.isLoading) return;

    // Kontrola limitu správ (len pri zapnutých platbách)
    if (!this.canSendMessage) {
      return; // UI zobrazí upgrade banner
    }

    this.isLoading = true;
    this.savedEntries = [];
    this.sendError = '';
    const text = this.message.trim();
    this.message = '';

    this.aiService.sendMessage(this.userId, text).subscribe({
      next: (response) => {
        this.incrementMessageCount();
        if (response.saved_entries && response.saved_entries.length > 0) {
          this.savedEntries = response.saved_entries;
          setTimeout(() => { if (this.showInsights) this.refreshCurrentTab(); }, 1000);
          setTimeout(() => { this.savedEntries = []; }, 5000);
        }
        this.pendingScroll = true;
      },
      error: () => {
        this.isLoading = false;
        this.message = text;
        this.sendError = 'Správu sa nepodarilo spracovať. Skontroluj pripojenie a skús to znova.';
        setTimeout(() => this.sendError = '', 6000);
      },
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
