/**
 * Textové pomôcky pre FitMind AI engine – normalizácia slovenčiny,
 * jednoduchý stemmer a čítanie čísel. Čistý TypeScript bez závislostí
 * (beží v prehliadači, v Capacitor appke aj v testoch).
 */

/** Malé písmená, bez diakritiky, čísla oddelené od písmen ("200g" → "200 g"). */
export function norm(input: string): string {
  return (input || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/(\d),(\d)/g, '$1.$2')
    .replace(/(\d)\s*x\b/g, '$1 x ')
    .replace(/(\d)([a-z])/g, '$1 $2')
    .replace(/([a-z])(\d)/g, '$1 $2')
    .replace(/[^a-z0-9.%/\s]/g, ' ')
    .replace(/\.(?!\d)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const SUFFIXES = [
  'ami', 'ach', 'och', 'ovi', 'ych', 'ich', 'ymi', 'imi', 'eho', 'emu',
  'ou', 'om', 'am', 'ov', 'ie', 'ia', 'iu', 'ej', 'ym', 'im', 'mi',
  'a', 'e', 'i', 'o', 'u', 'y'
];

/** Hrubý slovenský stemmer – odreže pádovú koncovku, aby "ryžu" = "ryža". */
export function stem(word: string): string {
  if (/^\d/.test(word)) return word;
  // vkladné samohlásky: halušiek → halušk(y), paradajok → paradajk(y), krajec → krajc(e)
  if (word.length >= 6 && word.endsWith('iek')) return word.slice(0, -3) + 'k';
  if (word.length >= 5 && word.endsWith('ok')) return word.slice(0, -2) + 'k';
  if (word.length >= 5 && word.endsWith('ec')) return word.slice(0, -2) + 'c';
  for (const s of SUFFIXES) {
    if (word.length - s.length >= 3 && word.endsWith(s)) {
      return word.slice(0, -s.length);
    }
  }
  return word;
}

export function tokens(normalized: string): string[] {
  return normalized.split(' ').filter(Boolean);
}

const NUMBER_WORDS: Record<string, number> = {
  pol: 0.5, polku: 0.5, polka: 0.5, polovicu: 0.5, polovica: 0.5,
  stvrt: 0.25, stvrtku: 0.25, poltora: 1.5, poldruha: 1.5,
  jeden: 1, jedna: 1, jedno: 1, jednu: 1, jedneho: 1,
  dva: 2, dve: 2, dvoch: 2, par: 2,
  tri: 3, troch: 3, styri: 4, styroch: 4, pat: 5, sest: 6, sedem: 7,
  osem: 8, devat: 9, desat: 10, dvanast: 12, patnast: 15, dvadsat: 20
};

/** Prečíta token ako číslo ("2", "1.5", "1/2", "dve", "pol"). */
export function parseNumber(token: string | undefined): number | null {
  if (!token) return null;
  if (/^\d+(\.\d+)?$/.test(token)) return parseFloat(token);
  const frac = token.match(/^(\d+)\/(\d+)$/);
  if (frac && +frac[2] > 0) return +frac[1] / +frac[2];
  return token in NUMBER_WORDS ? NUMBER_WORDS[token] : null;
}

export function pick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

export function round(value: number, decimals = 0): number {
  const m = Math.pow(10, decimals);
  return Math.round(value * m) / m;
}

/** Lokálny dátum ako YYYY-MM-DD. */
export function dayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Timestamp z Firestore / ISO string / Date → Date (alebo null). */
export function toDate(ts: any): Date | null {
  if (!ts) return null;
  try {
    if (ts instanceof Date) return ts;
    if (typeof ts.toDate === 'function') return ts.toDate();
    if (typeof ts.seconds === 'number') return new Date(ts.seconds * 1000);
    const d = new Date(ts);
    return isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}
