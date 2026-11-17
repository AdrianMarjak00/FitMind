import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, from } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { CoachContext, CustomFood, EMPTY_ENTRIES, EntryType } from '../ai/context';
import { goalProgress, recommendations, weeklyReport } from '../ai/coach';
import { EngineResult, respond } from '../ai/engine';
import { CatalogFile, catalogSize, loadCatalog } from '../ai/food-catalog';
import { toDate } from '../ai/text';
import { FitDataService } from './fit-data.service';
import { LlmService } from './llm.service';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  lastMessage: string;
}

export interface WeeklyReport {
  period: string;
  week_start: string;
  week_end: string;
  summary: any;
  achievements: string[];
  areas_to_improve: string[];
  recommendations: string[];
  goal_progress: any;
  overall_rating: string;
  overall_message: string;
}

export interface MonthlyReport {
  period: string;
  month_start: string;
  month_end: string;
  summary: any;
  trends: any;
  achievements: string[];
  recommendations: string[];
}

export interface GoalProgress {
  user_id: string;
  goals: string[];
  progress_items: Array<{
    goal: string;
    target: string;
    current: string;
    difference: string;
    percentage: number;
    on_track: boolean;
  }>;
}

export interface ChatResponse {
  odpoved: string;
  saved_entries: string[];
  /** 'engine' = vlastný FitMind engine, 'llm' = model v zariadení. */
  source: 'engine' | 'llm';
}

/**
 * AI tréner bez servera. Správu spracuje vlastný engine (src/app/ai),
 * záznamy sa uložia priamo do Firestore a konverzácia tiež.
 * Na voľné otázky môže odpovedať voliteľný model v zariadení (LlmService).
 */
@Injectable({
  providedIn: 'root'
})
export class AiService {
  private messagesSubject = new BehaviorSubject<ChatMessage[]>([]);
  public messages$ = this.messagesSubject.asObservable();

  private conversationsSubject = new BehaviorSubject<Conversation[]>([]);
  private activeConversationIdSubject = new BehaviorSubject<string | null>(null);

  public conversations$ = this.conversationsSubject.asObservable();
  public activeConversationId$ = this.activeConversationIdSubject.asObservable();

  /** Záznamy uložené v tomto rozhovore – aby sa dal posledný vrátiť späť. */
  private savedStack: Array<Array<{ type: EntryType; id: string; data: any }>> = [];

  /** Jedlá naučené od používateľa – načítajú sa raz a potom sa držia v pamäti. */
  private customFoods: CustomFood[] | null = null;
  private customFoodsUser = '';
  /** Neznáme jedlo, na ktorého kalórie sa tréner naposledy pýtal. */
  private pending: { name: string; count: number } | undefined;

  constructor(private data: FitDataService, private llm: LlmService) { }

  // === CHAT ===

  sendMessage(userId: string, message: string, conversationId?: string): Observable<ChatResponse> {
    return from(this.handleMessage(userId, message, conversationId));
  }

  /** Katalóg produktov (public/data/foods.json) sa sťahuje raz, pri prvej správe. */
  private catalogLoading: Promise<void> | null = null;

  private ensureCatalog(): Promise<void> {
    if (catalogSize() > 0) return Promise.resolve();
    if (!this.catalogLoading) {
      this.catalogLoading = fetch('data/foods.json')
        .then(res => res.ok ? res.json() : Promise.reject(new Error('HTTP ' + res.status)))
        .then((file: CatalogFile) => { loadCatalog(file); })
        .catch(err => {
          console.warn('[AI] katalóg potravín sa nepodarilo načítať', err);
          this.catalogLoading = null;   // skúsi sa znova pri ďalšej správe
        });
    }
    return this.catalogLoading || Promise.resolve();
  }

  private async loadContext(userId: string): Promise<CoachContext> {
    await this.ensureCatalog();
    const [profile, entries] = await Promise.all([
      this.data.getProfile(userId).catch(() => null),
      this.data.getCoachEntries(userId).catch(() => ({ ...EMPTY_ENTRIES }))
    ]);
    if (this.customFoods === null || this.customFoodsUser !== userId) {
      this.customFoods = await this.data.getCustomFoods(userId).catch(() => []);
      this.customFoodsUser = userId;
    }
    const last = this.savedStack[this.savedStack.length - 1];
    return {
      profile, entries, now: new Date(),
      customFoods: this.customFoods,
      pending: this.pending,
      canUndo: this.savedStack.length > 0,
      lastBatch: last?.map(e => ({ type: e.type, data: e.data }))
    };
  }

  private async handleMessage(userId: string, message: string, conversationId?: string): Promise<ChatResponse> {
    const before = this.messagesSubject.value;
    const userMsg: ChatMessage = { role: 'user', content: message, timestamp: new Date() };
    this.messagesSubject.next([...before, userMsg]);

    try {
      const ctx = await this.loadContext(userId);
      const result: EngineResult = respond(message, ctx);
      this.pending = result.pending;
      let text = result.text;
      let source: 'engine' | 'llm' = 'engine';
      const saved: string[] = [];

      // 1. Vykonaj akcie enginu (zápisy do denníka, vrátenie späť)
      const batch: Array<{ type: EntryType; id: string; data: any }> = [];
      let failed = 0;
      for (const action of result.actions) {
        if (action.kind === 'save') {
          try {
            const id = await this.data.addEntry(userId, action.type, action.data);
            batch.push({ type: action.type, id, data: action.data });
            if (action.label) saved.push(action.label);
          } catch (err) {
            console.error('[AI] zápis zlyhal', err);
            failed++;
          }
        } else if (action.kind === 'learn') {
          const key = action.food.name.toLowerCase();
          this.customFoods = [...(this.customFoods || []).filter(f => f.name.toLowerCase() !== key), action.food];
          this.data.saveCustomFood(userId, action.food).catch(err => console.warn('[AI] jedlo sa nepodarilo zapamätať', err));
        } else if (action.kind === 'undo') {
          const last = this.savedStack.pop() || [];
          await Promise.all(last.map(e => this.data.deleteEntry(userId, e.type, e.id).catch(() => undefined)));
        }
      }
      if (batch.length) this.savedStack.push(batch);
      if (failed) {
        text = failed === result.actions.length
          ? '⚠️ Záznam sa mi nepodarilo uložiť. Skontroluj pripojenie na internet a skús to znova.'
          : text + `\n\n⚠️ ${failed} záznam(y) sa nepodarilo uložiť, skús ich poslať znova.`;
      }

      // 2. Voľná otázka, ktorej engine nerozumel → model v zariadení (ak je zapnutý)
      if (result.fallback && this.llm.ready) {
        const reply = await this.llm.answer(message, ctx, before);
        if (reply) { text = reply; source = 'llm'; }
      }

      // 3. Zobraz odpoveď a ulož konverzáciu
      const aiMsg: ChatMessage = { role: 'assistant', content: text, timestamp: new Date() };
      this.messagesSubject.next([...before, userMsg, aiMsg]);
      this.persist(userId, message, text, conversationId).catch(err =>
        console.warn('[AI] konverzáciu sa nepodarilo uložiť', err));

      return { odpoved: text, saved_entries: saved, source };
    } catch (err) {
      this.messagesSubject.next(before);
      throw err;
    }
  }

  private async persist(userId: string, message: string, answer: string, conversationId?: string): Promise<void> {
    let convId = conversationId || this.activeConversationIdSubject.value;
    let title: string | undefined;
    if (!convId) {
      title = this.titleFrom(message);
      convId = await this.data.createConversation(userId, title);
      this.activeConversationIdSubject.next(convId);
    } else {
      const current = this.conversationsSubject.value.find(c => c.id === convId);
      if (current && (current.title === 'Nová konverzácia' || !current.lastMessage)) {
        title = this.titleFrom(message);
      }
    }
    await this.data.saveExchange(userId, convId, message, answer, title);
    await this.refreshConversations(userId);
  }

  private titleFrom(message: string): string {
    const clean = message.replace(/\s+/g, ' ').trim();
    return clean.length > 40 ? clean.slice(0, 40) + '…' : clean || 'Nová konverzácia';
  }

  clearChat(): void {
    this.messagesSubject.next([]);
  }

  // === KONVERZÁCIE ===

  getConversations(userId: string): Observable<{ conversations: Conversation[] }> {
    return from(this.data.getConversations(userId)).pipe(
      map(list => ({
        conversations: list.map(c => ({
          id: c.id,
          title: c.title,
          lastMessage: c.lastMessage,
          createdAt: toDate(c.createdAt) || new Date(),
          updatedAt: toDate(c.updatedAt) || new Date()
        }))
      }))
    );
  }

  private async refreshConversations(userId: string): Promise<Conversation[]> {
    const list = await new Promise<Conversation[]>((resolve, reject) =>
      this.getConversations(userId).subscribe({ next: r => resolve(r.conversations), error: reject }));
    this.conversationsSubject.next(list);
    return list;
  }

  loadConversations(userId: string): void {
    this.refreshConversations(userId).then(list => {
      if (!this.activeConversationIdSubject.value && list.length > 0) {
        this.switchConversation(userId, list[0].id);
      }
    }).catch(() => { /* bez konverzácií sa dá pokračovať */ });
  }

  createConversation(userId: string, title?: string): Observable<{ conversation_id: string }> {
    return from(this.data.createConversation(userId, title || 'Nová konverzácia')).pipe(
      map(id => ({ conversation_id: id })),
      tap(response => {
        this.activeConversationIdSubject.next(response.conversation_id);
        this.messagesSubject.next([]);
        this.savedStack = [];
        this.refreshConversations(userId).catch(() => undefined);
      })
    );
  }

  deleteConversation(userId: string, conversationId: string): Observable<any> {
    return from(this.data.deleteConversation(userId, conversationId)).pipe(
      tap(() => {
        if (this.activeConversationIdSubject.value === conversationId) {
          this.activeConversationIdSubject.next(null);
          this.messagesSubject.next([]);
        }
        this.loadConversations(userId);
      })
    );
  }

  switchConversation(userId: string, conversationId: string): void {
    this.activeConversationIdSubject.next(conversationId);
    this.savedStack = [];
    this.loadConversationMessages(userId, conversationId);
  }

  loadConversationMessages(userId: string, conversationId: string, limit: number = 50): void {
    this.data.getMessages(userId, conversationId, limit).then(messages => {
      if (this.activeConversationIdSubject.value !== conversationId) return;
      this.messagesSubject.next(messages.map(m => ({
        role: m.role,
        content: m.content,
        timestamp: toDate(m.timestamp) || new Date()
      })));
    }).catch(() => { /* história sa nenačítala */ });
  }

  getActiveConversationId(): string | null {
    return this.activeConversationIdSubject.value;
  }

  // === KOUČ ===

  getWeeklyReport(userId: string): Observable<{ user_id: string; report: WeeklyReport }> {
    return from(this.loadContext(userId)).pipe(
      map(ctx => ({ user_id: userId, report: weeklyReport(ctx) }))
    );
  }

  getPersonalizedRecommendations(userId: string): Observable<{
    user_id: string;
    recommendations: string[];
    count: number
  }> {
    return from(this.loadContext(userId)).pipe(
      map(ctx => {
        const list = recommendations(ctx);
        return { user_id: userId, recommendations: list, count: list.length };
      })
    );
  }

  getGoalProgress(userId: string): Observable<GoalProgress> {
    return from(this.loadContext(userId)).pipe(map(ctx => goalProgress(ctx, userId)));
  }

  /** Kontext používateľa pre ďalšie obrazovky (napr. tréningový plán). */
  getCoachContext(userId: string): Observable<CoachContext> {
    return from(this.loadContext(userId));
  }
}
