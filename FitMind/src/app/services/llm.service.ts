import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import {
  CoachContext, GOAL_SK, currentWeight, dayTotals, firstName, proteinTarget, targetCalories
} from '../ai/context';

export type LlmStatus = 'unsupported' | 'off' | 'loading' | 'ready' | 'error';

export interface LlmState {
  status: LlmStatus;
  /** 0–100 počas sťahovania / načítania modelu. */
  progress: number;
  detail: string;
}

const STORAGE_KEY = 'fitmind_llm_enabled';
const MODEL_F16 = 'gemma-2-2b-it-q4f16_1-MLC';
const MODEL_F32 = 'gemma-2-2b-it-q4f32_1-MLC';

/**
 * Voliteľný jazykový model, ktorý beží celý v prehliadači cez WebGPU
 * (knižnica WebLLM). Nevolá žiadne API – model sa raz stiahne (~1,5 GB),
 * uloží do cache prehliadača a potom funguje aj offline.
 *
 * Používa sa len na voľné otázky, ktorým vlastný FitMind engine nerozumie.
 * Zápisy do denníka a výpočty robí vždy engine.
 */
@Injectable({ providedIn: 'root' })
export class LlmService {
  private engine: any = null;
  private loading: Promise<void> | null = null;
  private stateSubject = new BehaviorSubject<LlmState>({
    status: this.isSupported() ? 'off' : 'unsupported', progress: 0, detail: ''
  });
  readonly state$ = this.stateSubject.asObservable();

  get state(): LlmState { return this.stateSubject.value; }
  get ready(): boolean { return this.state.status === 'ready' && !!this.engine; }

  isSupported(): boolean {
    return typeof navigator !== 'undefined' && 'gpu' in navigator;
  }

  /** Používateľ si model už raz zapol – pri ďalšej návšteve ho načítame z cache. */
  wasEnabled(): boolean {
    try { return localStorage.getItem(STORAGE_KEY) === '1'; } catch { return false; }
  }

  private remember(on: boolean): void {
    try { on ? localStorage.setItem(STORAGE_KEY, '1') : localStorage.removeItem(STORAGE_KEY); } catch { /* súkromný režim */ }
  }

  enable(): Promise<void> {
    if (!this.isSupported()) {
      this.stateSubject.next({ status: 'unsupported', progress: 0, detail: '' });
      return Promise.resolve();
    }
    if (this.ready) return Promise.resolve();
    if (!this.loading) {
      this.loading = this.load().finally(() => this.loading = null);
    }
    return this.loading;
  }

  private async load(): Promise<void> {
    this.stateSubject.next({ status: 'loading', progress: 0, detail: 'Pripravujem model…' });
    try {
      const adapter = await (navigator as any).gpu.requestAdapter();
      if (!adapter) throw new Error('Zariadenie nemá dostupnú grafickú akceleráciu (WebGPU).');
      const model = adapter.features?.has?.('shader-f16') ? MODEL_F16 : MODEL_F32;

      const webllm = await import('@mlc-ai/web-llm');
      this.engine = await webllm.CreateMLCEngine(model, {
        initProgressCallback: (report: { progress: number; text: string }) => {
          this.stateSubject.next({
            status: 'loading',
            progress: Math.round((report.progress || 0) * 100),
            detail: report.progress < 1 ? 'Sťahujem a načítavam model…' : 'Dokončujem…'
          });
        }
      });
      this.remember(true);
      this.stateSubject.next({ status: 'ready', progress: 100, detail: '' });
    } catch (err: any) {
      this.engine = null;
      this.remember(false);
      this.stateSubject.next({
        status: 'error', progress: 0,
        detail: err?.message || 'Model sa nepodarilo načítať.'
      });
    }
  }

  async disable(): Promise<void> {
    this.remember(false);
    const engine = this.engine;
    this.engine = null;
    this.stateSubject.next({ status: this.isSupported() ? 'off' : 'unsupported', progress: 0, detail: '' });
    try { await engine?.unload(); } catch { /* už uvoľnený */ }
  }

  /** Odpoveď modelu na voľnú otázku; pri chybe vráti null a použije sa odpoveď enginu. */
  async answer(question: string, ctx: CoachContext, history: Array<{ role: string; content: string }>): Promise<string | null> {
    if (!this.ready) return null;
    try {
      const turns = history.slice(-4).map(h => ({
        role: h.role === 'assistant' ? 'assistant' : 'user',
        content: h.content.slice(0, 500)
      }));
      // Gemma nemá systémovú rolu, preto inštrukcie idú do prvej správy.
      const messages = [
        { role: 'user', content: this.instructions(ctx) },
        { role: 'assistant', content: 'Rozumiem. Odpoviem stručne po slovensky.' },
        ...turns,
        { role: 'user', content: question }
      ];
      const reply = await this.engine.chat.completions.create({
        messages, temperature: 0.6, max_tokens: 400
      });
      const text = reply?.choices?.[0]?.message?.content?.trim();
      return text || null;
    } catch (err) {
      console.warn('[LLM] generovanie zlyhalo', err);
      return null;
    }
  }

  private instructions(ctx: CoachContext): string {
    const p = ctx.profile || {};
    const t = dayTotals(ctx);
    const facts = [
      firstName(ctx) ? `meno ${firstName(ctx)}` : '',
      p.age ? `${p.age} rokov` : '',
      p.height ? `${p.height} cm` : '',
      currentWeight(ctx) ? `${currentWeight(ctx)} kg` : '',
      p.fitnessGoal ? `cieľ: ${GOAL_SK[p.fitnessGoal] || p.fitnessGoal}` : '',
      targetCalories(ctx) ? `denný cieľ ${targetCalories(ctx)} kcal` : '',
      proteinTarget(ctx) ? `bielkoviny ${proteinTarget(ctx)} g` : '',
      `dnes zjedené ${t.calories} kcal`
    ].filter(Boolean).join(', ');
    return 'Si FitMind AI, priateľský osobný tréner a výživový poradca. Odpovedaj vždy po slovensky, ' +
      'vecne a stručne (najviac 6 viet), bez vymýšľania čísel. Pri zdravotných ťažkostiach odporuč lekára. ' +
      'Ak otázka nesúvisí so zdravím, pohybom alebo stravou, odpovedz krátko a ponúkni pomoc s fitness. ' +
      `Údaje o klientovi: ${facts}.`;
  }
}
