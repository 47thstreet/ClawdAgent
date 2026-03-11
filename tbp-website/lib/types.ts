export interface EventData {
  id: string;
  name: string;
  date: string;
  time: string;
  venue: string;
  location: string;
  description: string;
  image: string;
  source: 'posh' | 'vibe' | 'both';
  ticketUrl?: string;
  status?: 'upcoming' | 'past';
  featured: boolean;
  partners: string[];
  
  // Optional fields for different event types
  price?: string;
  ageRestriction?: string;
  dressCode?: string;
  attendees?: string;
  highlights?: string;
}