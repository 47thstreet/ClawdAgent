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
    id: 'vibe-001',
    name: 'Vibe Presents: TheBestParties',
    date: '2026-03-14',
    time: '9:00 PM - 4:00 AM',
    venue: 'Vibe Stadium',
    location: 'Los Angeles, CA',
    description: 'Exclusive event featuring the hottest electronic music artists.',
    image: '🎪',
    source: 'vibe',
    ticketUrl: 'https://www.vibestub.com/promoter/670d48fb-043c-4f07-a87d-516c0ad1214d',
    featured: true,
    partners: ['Vibe Hospitality Group'],
    price: '$75 - $250',
    ageRestriction: '21+',
    dressCode: 'Nightlife'
  },
  {
    id: 'vibe-002',
    name: 'Spring Festival 2026',
    date: '2026-03-28',
    time: '2:00 PM - 12:00 AM',
    venue: 'Beach Club Miami',
    location: 'Miami, FL',
    description: 'All-day electronic music festival with multiple stages.',
    image: '🏖️',
    source: 'vibe',
    ticketUrl: 'https://www.vibestub.com/promoter/670d48fb-043c-4f07-a87d-516c0ad1214d',
    featured: true,
    partners: ['Vibe Hospitality Group'],
    price: '$120 - $400',
    ageRestriction: '18+',
    dressCode: 'Beachwear'
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

// Function to fetch events from external sources
export async function fetchEventsFromSources(): Promise<EventData[]> {
  try {
    // This would be replaced with actual API calls to:
    // 1. Posh VIP API
    // 2. Vibe Hospitality Group API
    // 3. Any other event sources

    // Compute status dynamically from dates
    return mockEvents.map(event => ({
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
