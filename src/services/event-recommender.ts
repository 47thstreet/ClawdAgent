import config from '../config.js';
import logger from '../utils/logger.js';

/** Shape of an event from the Kartis public events API */
interface KartisEvent {
  name: string;
  date: string;
  time?: string;
  venue?: string;
  location?: string;
  description?: string;
  image?: string;
  ticketUrl?: string;
  price?: string | number;
  featured?: boolean;
  partners?: string[];
  ageRestriction?: string;
  dressCode?: string;
}

/** In-memory cache for Kartis events */
let cachedEvents: KartisEvent[] = [];
let cacheTimestamp = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/** Fetch events from Kartis API with 5-minute cache */
async function fetchEvents(): Promise<KartisEvent[]> {
  if (Date.now() - cacheTimestamp < CACHE_TTL_MS && cachedEvents.length > 0) {
    return cachedEvents;
  }

  const url = (config as any).KARTIS_EVENTS_URL ?? 'https://kartis-astro.vercel.app/api/cms/public-events';

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    cachedEvents = Array.isArray(data) ? data : [];
    cacheTimestamp = Date.now();
    logger.debug('Kartis events fetched', { count: cachedEvents.length });
    return cachedEvents;
  } catch (err: any) {
    logger.error('Failed to fetch Kartis events', { error: err.message });
    return cachedEvents; // return stale cache on error
  }
}

/** Get only future events, sorted by date ascending */
function getUpcomingEvents(events: KartisEvent[]): KartisEvent[] {
  const now = new Date();
  return events
    .filter(e => {
      try {
        return new Date(e.date) >= now;
      } catch { return false; }
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

/** Detect if text contains Hebrew characters */
function isHebrew(text: string): boolean {
  return /[\u0590-\u05FF]/.test(text);
}

/** Format a single event for WhatsApp */
function formatEvent(event: KartisEvent, hebrew: boolean): string {
  const date = (() => {
    try {
      const d = new Date(event.date);
      return d.toLocaleDateString(hebrew ? 'he-IL' : 'en-US', {
        weekday: 'short', day: 'numeric', month: 'short',
      });
    } catch { return event.date; }
  })();

  const lines: string[] = [];
  lines.push(`*${event.name}*`);
  lines.push(`${date}${event.time ? ' | ' + event.time : ''}`);
  if (event.venue) lines.push(event.venue + (event.location ? `, ${event.location}` : ''));
  if (event.price) lines.push(hebrew ? `${event.price} ₪` : `${event.price}`);
  if (event.ticketUrl) lines.push(event.ticketUrl);
  return lines.join('\n');
}

/** Day keywords for matching */
const DAY_KEYWORDS: Record<string, number> = {
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6,
  'ראשון': 0, 'שני': 1, 'שלישי': 2, 'רביעי': 3, 'חמישי': 4, 'שישי': 5, 'שבת': 6,
};

/**
 * Event recommendation service.
 * Fetches events from Kartis, matches user intent, and returns WhatsApp-formatted responses.
 */
export async function getRecommendation(userMessage: string): Promise<string> {
  const events = await fetchEvents();
  const upcoming = getUpcomingEvents(events);
  const hebrew = isHebrew(userMessage);
  const bodyLower = userMessage.toLowerCase();

  let matched: KartisEvent[] = [];

  // Check for specific day references
  const todayMatch = bodyLower.includes('tonight') || bodyLower.includes('today') ||
    bodyLower.includes('הערב') || bodyLower.includes('היום');
  const weekendMatch = bodyLower.includes('weekend') || bodyLower.includes('this weekend') ||
    bodyLower.includes('סוף שבוע') || bodyLower.includes('סופש');

  if (todayMatch) {
    const today = new Date().toISOString().slice(0, 10);
    matched = upcoming.filter(e => e.date?.startsWith(today));
  } else if (weekendMatch) {
    const now = new Date();
    const day = now.getDay();
    const daysToThursday = (4 - day + 7) % 7;
    const daysToSaturday = (6 - day + 7) % 7;
    const thurs = new Date(now); thurs.setDate(now.getDate() + daysToThursday);
    const sat = new Date(now); sat.setDate(now.getDate() + daysToSaturday + 1); // inclusive
    matched = upcoming.filter(e => {
      try {
        const d = new Date(e.date);
        return d >= thurs && d <= sat;
      } catch { return false; }
    });
  } else {
    // Check for specific day names
    for (const [keyword, dayNum] of Object.entries(DAY_KEYWORDS)) {
      if (bodyLower.includes(keyword)) {
        const now = new Date();
        const currentDay = now.getDay();
        const daysAhead = (dayNum - currentDay + 7) % 7 || 7;
        const targetDate = new Date(now);
        targetDate.setDate(now.getDate() + daysAhead);
        const targetStr = targetDate.toISOString().slice(0, 10);
        matched = upcoming.filter(e => e.date?.startsWith(targetStr));
        break;
      }
    }
  }

  // If no date-specific match, try keyword matching against event names/descriptions
  if (matched.length === 0) {
    const searchTerms = bodyLower
      .replace(/[^\w\u0590-\u05FFא-ת\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 2);

    matched = upcoming.filter(e => {
      const haystack = `${e.name} ${e.description ?? ''} ${e.venue ?? ''}`.toLowerCase();
      return searchTerms.some(term => haystack.includes(term));
    });
  }

  // Build response
  const header = hebrew
    ? '🎉 *The Best Parties*\n'
    : '🎉 *The Best Parties*\n';

  if (matched.length > 0) {
    const top = matched.slice(0, 3);
    const eventList = top.map(e => formatEvent(e, hebrew)).join('\n\n');
    const footer = hebrew
      ? '\n\n_כל האירועים_ ➡️ https://thebestparties.co.il'
      : '\n\nAll events ➡️ https://thebestparties.co.il';
    return header + eventList + footer;
  }

  // No match — show next 3 upcoming events as suggestions
  if (upcoming.length > 0) {
    const top = upcoming.slice(0, 3);
    const intro = hebrew
      ? 'לא מצאנו אירוע ספציפי, אבל הנה מה שבקרוב:'
      : "Here's what's coming up:";
    const eventList = top.map(e => formatEvent(e, hebrew)).join('\n\n');
    const footer = hebrew
      ? '\n\n_כל האירועים_ ➡️ https://thebestparties.co.il'
      : '\n\nAll events ➡️ https://thebestparties.co.il';
    return header + intro + '\n\n' + eventList + footer;
  }

  // No events at all
  return hebrew
    ? '🎉 *The Best Parties*\n\nאין אירועים קרובים כרגע.\nעקבו אחרינו ➡️ https://thebestparties.co.il'
    : '🎉 *The Best Parties*\n\nNo upcoming events right now.\nStay tuned ➡️ https://thebestparties.co.il';
}

/**
 * Format upcoming events for broadcast messages.
 * Returns a WhatsApp-formatted string with up to maxEvents events.
 */
export async function formatEventsForBroadcast(maxEvents = 5): Promise<string> {
  const events = await fetchEvents();
  const upcoming = getUpcomingEvents(events);

  if (upcoming.length === 0) {
    return '🎉 *The Best Parties*\n\nNo upcoming events right now.';
  }

  const top = upcoming.slice(0, maxEvents);
  const eventList = top.map(e => formatEvent(e, true)).join('\n\n');
  return `🎉 *The Best Parties — אירועים קרובים*\n\n${eventList}\n\n_כל האירועים_ ➡️ https://thebestparties.co.il`;
}
