import { Injectable, Injector, inject, runInInjectionContext } from '@angular/core';
import {
  Firestore, Timestamp, addDoc, collection, deleteDoc, doc, getDoc, getDocs,
  limit, orderBy, query, updateDoc, where, writeBatch
} from '@angular/fire/firestore';
import { CoachEntries, EntryType } from '../ai/context';
import { toDate } from '../ai/text';

export interface StoredMessage { role: 'user' | 'assistant'; content: string; timestamp: string | null; }
export interface StoredConversation {
  id: string; title: string; createdAt: string | null; updatedAt: string | null; lastMessage: string;
}

/**
 * Jediné miesto, kde aplikácia číta a zapisuje dáta používateľa.
 * Nahrádza pôvodný Python backend – všetko ide priamo do Firestore
 * pod users/{uid}/…, prístup stráži firestore.rules.
 */
@Injectable({ providedIn: 'root' })
export class FitDataService {
  private firestore = inject(Firestore);
  private injector = inject(Injector);

  static readonly COLLECTIONS: Record<EntryType, string> = {
    food: 'foodEntries',
    exercise: 'workoutEntries',
    stress: 'stressEntries',
    mood: 'moodEntries',
    sleep: 'sleepEntries',
    weight: 'weightEntries'
  };

  private run<T>(fn: () => Promise<T>): Promise<T> {
    return runInInjectionContext(this.injector, fn);
  }

  private iso(ts: any): string | null {
    const d = toDate(ts);
    return d ? d.toISOString() : null;
  }

  private entries(userId: string, type: EntryType) {
    return collection(this.firestore, 'users', userId, FitDataService.COLLECTIONS[type]);
  }

  // ---------------- Profil ----------------

  getProfile(userId: string): Promise<any | null> {
    return this.run(async () => {
      const snap = await getDoc(doc(this.firestore, 'users', userId));
      return snap.exists() ? snap.data() : null;
    });
  }

  // ---------------- Záznamy ----------------

  /** Záznamy za posledných N kalendárnych dní (1 = dnes), od najnovšieho. */
  getEntries(userId: string, type: EntryType, days = 30, max = 100): Promise<any[]> {
    return this.run(async () => {
      const from = new Date();
      from.setHours(0, 0, 0, 0);
      from.setDate(from.getDate() - (Math.max(1, days) - 1));
      const q = query(
        this.entries(userId, type),
        where('timestamp', '>=', Timestamp.fromDate(from)),
        orderBy('timestamp', 'desc'),
        limit(max)
      );
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ ...d.data(), id: d.id, timestamp: this.iso(d.data()['timestamp']) }));
    });
  }

  /** Uloží záznam; pole `date` (ISO) sa zmení na timestamp, inak sa použije aktuálny čas. */
  addEntry(userId: string, type: EntryType, data: any): Promise<string> {
    return this.run(async () => {
      const clean: any = {};
      Object.keys(data || {}).forEach(key => {
        if (data[key] !== undefined && key !== 'date' && key !== 'id') clean[key] = data[key];
      });
      const when = toDate(data?.date) || toDate(data?.timestamp) || new Date();
      clean.timestamp = Timestamp.fromDate(when);
      const ref = await addDoc(this.entries(userId, type), clean);
      return ref.id;
    });
  }

  deleteEntry(userId: string, type: EntryType, entryId: string): Promise<void> {
    return this.run(() => deleteDoc(doc(this.entries(userId, type), entryId)));
  }

  /** Všetko, čo AI tréner potrebuje na odpoveď – jedným paralelným načítaním. */
  async getCoachEntries(userId: string): Promise<CoachEntries> {
    const safe = (type: EntryType, days: number, max: number) =>
      this.getEntries(userId, type, days, max).catch(() => []);
    const [food, exercise, weight, mood, sleep, stress] = await Promise.all([
      safe('food', 7, 200), safe('exercise', 7, 100), safe('weight', 30, 30),
      safe('mood', 7, 30), safe('sleep', 7, 30), safe('stress', 7, 30)
    ]);
    return { food, exercise, weight, mood, sleep, stress };
  }

  // ---------------- Konverzácie ----------------

  private conversations(userId: string) {
    return collection(this.firestore, 'users', userId, 'conversations');
  }

  getConversations(userId: string, max = 50): Promise<StoredConversation[]> {
    return this.run(async () => {
      const snap = await getDocs(query(this.conversations(userId), orderBy('updatedAt', 'desc'), limit(max)));
      return snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          title: data['title'] || 'Bez názvu',
          createdAt: this.iso(data['createdAt']),
          updatedAt: this.iso(data['updatedAt']),
          lastMessage: data['lastMessage'] || ''
        };
      });
    });
  }

  createConversation(userId: string, title = 'Nová konverzácia'): Promise<string> {
    return this.run(async () => {
      const now = Timestamp.now();
      const ref = await addDoc(this.conversations(userId), { title, createdAt: now, updatedAt: now, lastMessage: '' });
      return ref.id;
    });
  }

  deleteConversation(userId: string, conversationId: string): Promise<void> {
    return this.run(async () => {
      const convRef = doc(this.conversations(userId), conversationId);
      const messages = await getDocs(collection(convRef, 'messages'));
      for (let i = 0; i < messages.docs.length; i += 400) {
        const batch = writeBatch(this.firestore);
        messages.docs.slice(i, i + 400).forEach(m => batch.delete(m.ref));
        await batch.commit();
      }
      await deleteDoc(convRef);
    });
  }

  getMessages(userId: string, conversationId: string, max = 50): Promise<StoredMessage[]> {
    return this.run(async () => {
      const ref = collection(doc(this.conversations(userId), conversationId), 'messages');
      const snap = await getDocs(query(ref, orderBy('timestamp', 'desc'), limit(max)));
      return snap.docs.reverse().map(d => ({
        role: d.data()['role'] === 'assistant' ? 'assistant' : 'user',
        content: d.data()['content'] || '',
        timestamp: this.iso(d.data()['timestamp'])
      }));
    });
  }

  /** Uloží dvojicu správ (otázka + odpoveď) a aktualizuje náhľad konverzácie. */
  saveExchange(userId: string, conversationId: string, userText: string, aiText: string, title?: string): Promise<void> {
    return this.run(async () => {
      const convRef = doc(this.conversations(userId), conversationId);
      const messages = collection(convRef, 'messages');
      const now = Date.now();
      await addDoc(messages, { role: 'user', content: userText, timestamp: Timestamp.fromMillis(now) });
      await addDoc(messages, { role: 'assistant', content: aiText, timestamp: Timestamp.fromMillis(now + 1) });
      const preview = aiText.replace(/\s+/g, ' ').slice(0, 60) + (aiText.length > 60 ? '...' : '');
      const update: any = { updatedAt: Timestamp.fromMillis(now + 1), lastMessage: preview };
      if (title) update.title = title;
      await updateDoc(convRef, update);
    });
  }
}
