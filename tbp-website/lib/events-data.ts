import { EventData } from '@/lib/types';

// Mock data structure - this could be replaced with API calls
export const mockEvents: EventData[] = [
  // Events from Posh VIP
  {
    id: 'posh-001',
    name: 'Israeli Thursdays - TheBestParties',
    date: '2026-03-12',
    time: '10:00 PM - 6:00 AM',
    venue: 'The Loft',
    location: 'Tel Aviv, Israel',
    description: 'The ultimate Israeli party experience with top DJs and the best crowd.',
    image: '🎵',
    source: 'posh',
    ticketUrl: 'https://posh.vip/g/thebestparties',
    featured: true,
    partners: ['Posh VIP'],
    price: '₪120 early bird',
    ageRestriction: '21+',
    dressCode: 'Trendy'
  },
  {
    id: 'posh-002',
    name: 'Friday Night Special',
    date: '2026-03-20',
    time: '11:00 PM - 5:00 AM',
    venue: 'Club Paradise',
    location: 'Tel Aviv, Israel',
    description: 'Weekly Friday night party with international guest DJs.',
    image: '🌟',
    source: 'posh',
    ticketUrl: 'https://posh.vip/g/thebestparties',
    featured: false,
    partners: ['Posh VIP'],
    price: '₪150',
    ageRestriction: '18+',
    dressCode: 'Casual chic'
  },

  // Events from Vibe Hospitality Group
  {
    id: 'vibe-jsc-01',
    name: 'JSC – Crushing Happy Hour',
    date: '2026-03-11',
    time: '6:00 PM - 10:00 PM',
    venue: 'Local Bar',
    location: 'New York, NY',
    description: 'Join us for a crushing happy hour with great drinks and networking.',
    image: '🍻',
    source: 'vibe',
    ticketUrl: 'https://www.vibestub.com/e/jsc0311?utm_source=promoter&utm_id=670d48fb53e44657821d516c0ad1214d',
    featured: false,
    partners: ['Vibe Hospitality Group', 'JSC'],
    price: 'Free RSVP',
    ageRestriction: '21+',
    dressCode: 'Casual'
  },
  {
    id: 'vibe-jsc-02',
    name: 'JSC – Former Jewish Soviet Union Happy Hour',
    date: '2026-03-18',
    time: '6:00 PM - 10:00 PM',
    venue: 'Lounge 88',
    location: 'New York, NY',
    description: 'A special happy hour gathering for the FSU Jewish community.',
    image: '🥂',
    source: 'vibe',
    ticketUrl: 'https://www.vibestub.com/e/jsc03118?utm_source=promoter&utm_id=670d48fb53e44657821d516c0ad1214d',
    featured: false,
    partners: ['Vibe Hospitality Group', 'JSC'],
    price: 'Free RSVP',
    ageRestriction: '21+',
    dressCode: 'Casual'
  },
  {
    id: 'vibe-pass-01',
    name: 'PASSOVER BALAGAN @ LUNASOL MIAMI',
    date: '2026-04-04',
    time: '10:00 PM - 4:00 AM',
    venue: 'Lunasol',
    location: 'Miami, FL',
    description: 'Kick off Passover with an unforgettable night of music and celebration at Lunasol Miami.',
    image: '🌴',
    source: 'vibe',
    ticketUrl: 'https://www.vibestub.com/e/pass1?utm_source=promoter&utm_id=670d48fb53e44657821d516c0ad1214d',
    featured: true,
    partners: ['Vibe Hospitality Group'],
    price: 'Tiered Pricing',
    ageRestriction: '21+',
    dressCode: 'Nightlife'
  },
  {
    id: 'vibe-pass-02',
    name: 'Matza Mania NYC Passover Party',
    date: '2026-04-04',
    time: '10:00 PM - 4:00 AM',
    venue: 'Fifty Four Nightclub',
    location: 'New York, NY',
    description: 'The ultimate Passover party in NYC at the iconic Fifty Four Nightclub.',
    image: '🎉',
    source: 'vibe',
    ticketUrl: 'https://www.vibestub.com/e/mania54?utm_source=promoter&utm_id=670d48fb53e44657821d516c0ad1214d',
    featured: true,
    partners: ['Vibe Hospitality Group'],
    price: 'Tiered Pricing',
    ageRestriction: '21+',
    dressCode: 'Nightclub Attire'
  },
  {
    id: 'vibe-pass-03',
    name: 'Passover Pool Party @ Strawberry Moon Miami',
    date: '2026-04-05',
    time: '12:00 PM - 8:00 PM',
    venue: 'Strawberry Moon',
    location: 'Miami, FL',
    description: 'Epic daytime pool party at Strawberry Moon to celebrate Passover.',
    image: '🌊',
    source: 'vibe',
    ticketUrl: 'https://www.vibestub.com/e/passpool?utm_source=promoter&utm_id=670d48fb53e44657821d516c0ad1214d',
    featured: true,
    partners: ['Vibe Hospitality Group'],
    price: 'Tiered Pricing',
    ageRestriction: '21+',
    dressCode: 'Swimwear'
  },
  {
    id: 'vibe-pass-04',
    name: 'THE PASSOVER SOIREE @ MARION MIAMI',
    date: '2026-04-05',
    time: '8:00 PM - 3:00 AM',
    venue: 'Marion Miami',
    location: 'Miami, FL',
    description: 'An elegant Passover Soiree at the luxurious Marion Miami.',
    image: '🥂',
    source: 'vibe',
    ticketUrl: 'https://www.vibestub.com/e/pass2?utm_source=promoter&utm_id=670d48fb53e44657821d516c0ad1214d',
    featured: true,
    partners: ['Vibe Hospitality Group'],
    price: 'Tiered Pricing',
    ageRestriction: '21+',
    dressCode: 'Elegant / Chic'
  },
  {
    id: 'vibe-pass-05',
    name: 'PASSOVER ON THE RIVER @ Kiki on the River',
    date: '2026-04-06',
    time: '4:00 PM - 12:00 AM',
    venue: 'Kiki on the River',
    location: 'Miami, FL',
    description: 'Sunset party by the river to celebrate Passover in style.',
    image: '⛵',
    source: 'vibe',
    ticketUrl: 'https://www.vibestub.com/e/pass4?utm_source=promoter&utm_id=670d48fb53e44657821d516c0ad1214d',
    featured: true,
    partners: ['Vibe Hospitality Group'],
    price: 'Tiered Pricing',
    ageRestriction: '21+',
    dressCode: 'Smart Casual'
  },
  {
    id: 'vibe-pass-06',
    name: 'Official Mimuna Finale Party @ SHISO W/ DJ ERAN HERSH',
    date: '2026-04-09',
    time: '10:00 PM - 4:00 AM',
    venue: 'SHISO Covered Rooftop',
    location: 'Miami, FL',
    description: 'Close out the holiday with the Official Mimuna Finale Party featuring DJ Eran Hersh.',
    image: '🎪',
    source: 'vibe',
    ticketUrl: 'https://www.vibestub.com/e/rooftop0531-2?utm_source=promoter&utm_id=670d48fb53e44657821d516c0ad1214d',
    featured: true,
    partners: ['Vibe Hospitality Group'],
    price: 'Tiered Pricing',
    ageRestriction: '21+',
    dressCode: 'Nightlife'
  },

  // Past events
  {
    id: 'past-vibe-001',
    name: 'Vibe Presents: TheBestParties',
    date: '2026-03-01',
    time: '9:00 PM - 4:00 AM',
    venue: 'Vibe Stadium',
    location: 'Los Angeles, CA',
    description: 'Exclusive event featuring the hottest electronic music artists.',
    image: '🎪',
    source: 'vibe',
    featured: false,
    partners: ['Vibe Hospitality Group'],
    attendees: '800+',
    highlights: 'Sold out show, 3 stages'
  },
  {
    id: 'past-posh-001',
    name: 'Israeli Thursdays - TheBestParties',
    date: '2026-02-26',
    time: '10:00 PM - 6:00 AM',
    venue: 'The Loft',
    location: 'Tel Aviv, Israel',
    description: 'The ultimate Israeli party experience with top DJs and the best crowd.',
    image: '🎵',
    source: 'posh',
    featured: false,
    partners: ['Posh VIP'],
    attendees: '600+',
    highlights: 'Special guest DJ set'
  },
  {
    id: 'past-001',
    name: 'New Year\'s Eve 2025',
    date: '2025-12-31',
    time: '10:00 PM - 6:00 AM',
    venue: 'Dream Venue',
    location: 'Miami, FL',
    description: 'Epic New Year\'s celebration with countdown and fireworks.',
    image: '🎆',
    source: 'both',
    featured: true,
    partners: ['Posh VIP', 'Vibe Hospitality Group'],
    attendees: '2000+',
    highlights: 'Fireworks countdown, 5 stages'
  },
  {
    id: 'past-002',
    name: 'Summer Vibes 2025',
    date: '2025-08-15',
    time: '4:00 PM - 11:00 PM',
    venue: 'Rooftop Gardens',
    location: 'New York, NY',
    description: 'Sunset to night party with tropical beats.',
    image: '🌅',
    source: 'vibe',
    featured: false,
    partners: ['Vibe Hospitality Group'],
    attendees: '500+',
    highlights: 'Golden hour views, pool party'
  }
];

// Compute status dynamically based on event date
function computeStatus(event: Omit<EventData, 'status'>): 'upcoming' | 'past' {
  const eventDate = new Date(event.date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return eventDate >= today ? 'upcoming' : 'past';
}

async function scrapeVibestubEvents(): Promise<EventData[]> {
  try {
    const url = 'https://www.vibestub.com/promoter/670d48fb-043c-4f07-a87d-516c0ad1214d?utm_source=promoter&utm_id=670d48fb53e44657821d516c0ad1214d';
    // Use ISR caching so we only hit Vibestub once a day (86400 seconds)
    const response = await fetch(url, { next: { revalidate: 86400 } });
    if (!response.ok) return [];

    const html = await response.text();
    // Dynamically import cheerio so it doesn't break edge runtimes if used there
    const cheerio = await import('cheerio');
    const $ = cheerio.load(html);

    const events: EventData[] = [];
    const seenHrefs = new Set<string>();

    // Extract events by parsing links on the promoter page
    $('a[href*="/e/"]').each((_: number, el: any) => {
      const href = $(el).attr('href');
      if (!href) return;

      const fullUrl = href.startsWith('http') ? href : `https://www.vibestub.com${href.startsWith('/') ? href : '/' + href}`;

      const text = $(el).text().trim();
      // Look for links that contain the actual event titles (not "More details" or "Tickets")
      if (text.length > 5 && !text.toLowerCase().includes('more details') && !text.toLowerCase().includes('tickets')) {
        if (seenHrefs.has(fullUrl)) return;
        seenHrefs.add(fullUrl);

        let id = 'vibe-scraped-' + Math.random().toString(36).substr(2, 9);
        try {
          const urlObj = new URL(fullUrl);
          id = 'vibe-' + urlObj.pathname.split('/').pop();
        } catch (e) { }

        // Use a default future date so they show up as upcoming since exact date parsing requires deep page scraping
        const defaultDate = new Date();
        defaultDate.setDate(defaultDate.getDate() + 14);

        events.push({
          id,
          name: text,
          date: defaultDate.toISOString().split('T')[0],
          time: '10:00 PM - 4:00 AM',
          venue: 'See Event Page',
          location: 'TBA',
          description: 'Automated listing from VibeStub. Visit the link for full details, venue, and tickets.',
          image: '🎟️',
          source: 'vibe',
          ticketUrl: fullUrl,
          featured: false,
          partners: ['Vibe Hospitality Group'],
          price: 'Check Link',
          ageRestriction: '21+',
          dressCode: 'Nightlife'
        });
      }
    });

    return events;
  } catch (err) {
    console.error('Failed to scrape Vibestub:', err);
    return [];
  }
}

// Function to fetch events from external sources
export async function fetchEventsFromSources(): Promise<EventData[]> {
  try {
    const scrapedEvents = await scrapeVibestubEvents();

    // Filter out scraped events that we already hand-coded in mockEvents to prevent duplicates
    const existingTitles = mockEvents.map(e => e.name.toLowerCase());
    const uniqueScraped = scrapedEvents.filter(scraped => {
      return !existingTitles.some(title =>
        scraped.name.toLowerCase().includes(title) ||
        title.includes(scraped.name.toLowerCase())
      );
    });

    const combinedEvents = [...mockEvents, ...uniqueScraped];

    // Compute status dynamically from dates
    return combinedEvents.map(event => ({
      ...event,
      status: computeStatus(event)
    }));
  } catch (error) {
    console.error('Error fetching events:', error);
    return mockEvents.map(event => ({
      ...event,
      status: computeStatus(event)
    }));
  }
}

// Function to filter events by status
export function filterEventsByStatus(events: EventData[], status: 'upcoming' | 'past' | 'all'): EventData[] {
  if (status === 'all') return events;
  return events.filter(event => event.status === status);
}

// Function to get featured events
export function getFeaturedEvents(events: EventData[]): EventData[] {
  return events.filter(event => event.featured);
}

// Function to get events by partner
export function getEventsByPartner(events: EventData[], partner: string): EventData[] {
  return events.filter(event =>
    event.partners.some(p =>
      p.toLowerCase().includes(partner.toLowerCase())
    )
  );
}
