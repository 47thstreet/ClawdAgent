'use client';

import { motion } from 'framer-motion';
import { Calendar, Clock, MapPin, Ticket, ArrowRight, ExternalLink, Star, Music, Sparkles, Loader2 } from 'lucide-react';
import ParticleBackground from '@/components/ParticleBackground';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { EventData } from '@/lib/types';
import { filterEventsByStatus } from '@/lib/events-data';

interface EventsResponse {
  success: boolean;
  data: EventData[];
  count: number;
  error?: string;
  filters: {
    status: string;
    source: string | null;
    featured: string | null;
  };
}

export default function EventsPage() {
  const [events, setEvents] = useState<EventData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [upcomingEvents, setUpcomingEvents] = useState<EventData[]>([]);
  const [pastEvents, setPastEvents] = useState<EventData[]>([]);

  useEffect(() => {
    async function fetchEvents() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch('/api/events?status=all');
        const result: EventsResponse = await response.json();

        if (result.success) {
          setEvents(result.data);
          setUpcomingEvents(filterEventsByStatus(result.data, 'upcoming'));
          setPastEvents(filterEventsByStatus(result.data, 'past'));
        } else {
          setError(result.error || 'Failed to fetch events');
        }
      } catch (err) {
        console.error('Error fetching events:', err);
        setError('Network error occurred');
      } finally {
        setLoading(false);
      }
    }

    fetchEvents();
  }, []);

  return (
    <main className="relative min-h-screen">
      <ParticleBackground />

      {/* Header */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex items-center justify-center gap-2 mb-6">
              <Calendar className="w-6 h-6 text-[#b983ff]" />
              <span className="text-[#ff80df] font-medium tracking-widest text-sm uppercase">
                Events
              </span>
              <Sparkles className="w-6 h-6 text-[#80ffea]" />
            </div>

            <h1 className="text-5xl md:text-7xl font-bold mb-6">
              <span className="gradient-text">Upcoming</span>{' '}
              <span className="text-white">&</span>{' '}
              <span className="gradient-text">Past</span>
            </h1>

            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Never miss a moment. Browse our upcoming events or relive the magic of past experiences.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Upcoming Events */}
      {/* Loading State */}
      {loading && (
        <section className="py-20 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center">
              <Loader2 className="w-12 h-12 animate-spin text-[#b983ff] mx-auto mb-4" />
              <p className="text-gray-400">Loading events...</p>
            </div>
          </div>
        </section>
      )}

      {/* Error State */}
      {error && (
        <section className="py-20 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center">
              <div className="text-6xl mb-4">⚠️</div>
              <h2 className="text-2xl font-bold mb-2 text-red-400">Error Loading Events</h2>
              <p className="text-gray-400 mb-4">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="neon-button px-6 py-3 bg-gradient-to-r from-[#b983ff] to-[#ff80df] rounded-full font-medium"
              >
                Try Again
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Upcoming Events */}
      {!loading && !error && upcomingEvents.length > 0 && (
        <section className="py-20 px-4">
          <div className="max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mb-12"
            >
              <h2 className="text-3xl md:text-4xl font-bold mb-2 flex items-center gap-3">
                <Star className="w-8 h-8 text-[#b983ff] fill-[#b983ff]" />
                <span className="gradient-text">Upcoming Events</span>
              </h2>
              <p className="text-gray-400 ml-11">Get your tickets before they&apos;re gone!</p>
            </motion.div>

            <div className="grid md:grid-cols-2 gap-8">
              {upcomingEvents.map((event, index) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                >
                  <EventCard event={event} featured={event.featured} />
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* No Events Message */}
      {!loading && !error && upcomingEvents.length === 0 && (
        <section className="py-20 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center">
              <div className="text-6xl mb-4">📅</div>
              <h2 className="text-2xl font-bold mb-2">No Upcoming Events</h2>
              <p className="text-gray-400">Check back soon for new events!</p>
            </div>
          </div>
        </section>
      )}

      {/* Past Events */}
      {!loading && !error && pastEvents.length > 0 && (
        <section className="py-20 px-4">
          <div className="max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mb-12"
            >
              <h2 className="text-3xl md:text-4xl font-bold mb-2 flex items-center gap-3">
                <Music className="w-8 h-8 text-[#ff80df]" />
                <span className="gradient-text">Past Events</span>
              </h2>
              <p className="text-gray-400 ml-11">The memories that made us.</p>
            </motion.div>

            <div className="grid md:grid-cols-2 gap-8">
              {pastEvents.map((event, index) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                >
                  <EventCard event={event} featured={event.featured} />
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* No Past Events Message */}
      {!loading && !error && pastEvents.length === 0 && (
        <section className="py-20 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center">
              <div className="text-6xl mb-4">🎉</div>
              <h2 className="text-2xl font-bold mb-2">No Past Events Yet</h2>
              <p className="text-gray-400">Your event history will appear here.</p>
            </div>
          </div>
        </section>
      )}

      {/* Links & Partners Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="glass rounded-3xl p-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-8 text-center">
              <span className="gradient-text">Official Links</span>
            </h2>

            <div className="grid md:grid-cols-2 gap-6">
              <LinkCard
                title="Instagram"
                description="Follow for latest updates and behind-the-scenes"
                url="https://www.instagram.com/thebestparties.ofc"
                icon="📸"
                color="#b983ff"
              />
              <LinkCard
                title="Posh VIP - Israeli Thursdays"
                description="Guest list, RSVPs, and exclusive access"
                url="https://posh.vip/g/thebestparties"
                icon="🎟️"
                color="#ff80df"
              />
              <LinkCard
                title="Dream Hospitality Group"
                description="Premium ticketing and exclusive event access"
                url="https://tickets.dreamhospitalitygroup.com/promoter/67acd1fc-c56c-43bb-9b62-003a0a1e6008?utm_source=promoter&utm_id=67acd1fc894840f0a3d8003a0a1e6008"
                icon="🎫"
                color="#80ffea"
              />
              <LinkCard
                title="Vibe Hospitality Group"
                description="Curated nightlife experiences and VIP access"
                url="https://www.vibestub.com/promoter/670d48fb-043c-4f07-a87d-516c0ad1214d?utm_source=promoter&utm_id=670d48fb53e44657821d516c0ad1214d"
                icon="🎪"
                color="#b983ff"
              />
              <LinkCard
                title="Helium Mobile"
                description="FREE phone service - Use code PSN8VRY"
                url="https://app.heliummobile.com/o6WA/4tf146oc"
                icon="📱"
                color="#ffffff"
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Don&apos;t See What You&apos;re Looking For?
            </h2>
            <p className="text-gray-300 text-lg mb-8">
              Follow us on Instagram for exclusive announcements, presales, and secret events.
            </p>
            <Link
              href="/"
              className="neon-button inline-flex items-center gap-2 px-10 py-5 bg-gradient-to-r from-[#b983ff] to-[#ff80df] rounded-full font-bold text-xl"
            >
              Back to Home
              <ArrowRight className="w-6 h-6" />
            </Link>
          </motion.div>
        </div>
      </section>
    </main>
  );
}

function EventCard({ event, featured }: { event: EventData; featured: boolean }) {
  const isUpcoming = event.status === 'upcoming';

  return (
    <motion.div
      whileHover={{ y: -5 }}
      className={`glass rounded-2xl overflow-hidden group ${featured ? 'border-[#b983ff]/30' : ''}`}
    >
      {/* Event Header with Emoji */}
      <div className="h-48 bg-gradient-to-br from-[#b983ff]/20 to-[#ff80df]/20 flex items-center justify-center text-8xl group-hover:scale-110 transition-transform duration-500">
        {event.image}
      </div>

      <div className="p-6">
        {/* Featured Badge */}
        {featured && (
          <div className="mb-3">
            <span className="inline-block px-3 py-1 bg-gradient-to-r from-[#b983ff] to-[#ff80df] rounded-full text-xs font-bold uppercase tracking-wider">
              Featured Event
            </span>
          </div>
        )}

        {/* Source Badge */}
        <div className="mb-3">
          <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${event.source === 'posh' ? 'bg-[#b983ff]/20 text-[#b983ff]' :
              event.source === 'vibe' ? 'bg-[#ff80df]/20 text-[#ff80df]' :
                'bg-[#80ffea]/20 text-[#80ffea]'
            }`}>
            {event.source?.toUpperCase() ?? 'LOCAL'}
          </span>
        </div>

        {/* Event Name */}
        <h3 className="text-2xl font-bold mb-3">{event.name}</h3>

        {/* Event Details */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-gray-400">
            <Calendar className="w-4 h-4" />
            <span>{new Date(event.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-400">
            <Clock className="w-4 h-4" />
            <span>{event.time}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-400">
            <MapPin className="w-4 h-4" />
            <span>{event.venue} - {event.location}</span>
          </div>
        </div>

        {/* Additional Info */}
        {(event.price || event.ageRestriction || event.dressCode) && (
          <div className="grid grid-cols-3 gap-2 mb-4 text-sm">
            {event.price && (
              <div className="bg-white/5 rounded p-2 text-center">
                <div className="text-gray-500">Price</div>
                <div className="font-medium">{event.price}</div>
              </div>
            )}
            {event.ageRestriction && (
              <div className="bg-white/5 rounded p-2 text-center">
                <div className="text-gray-500">Age</div>
                <div className="font-medium">{event.ageRestriction}</div>
              </div>
            )}
            {event.dressCode && (
              <div className="bg-white/5 rounded p-2 text-center">
                <div className="text-gray-500">Dress</div>
                <div className="font-medium">{event.dressCode}</div>
              </div>
            )}
          </div>
        )}

        {/* Description */}
        <p className="text-gray-400 mb-4 line-clamp-2">{event.description}</p>

        {/* Partners */}
        <div className="flex flex-wrap gap-2 mb-4">
          {event.partners.map((partner) => (
            <span
              key={partner}
              className="px-2 py-1 bg-white/5 rounded text-xs text-gray-400"
            >
              {partner}
            </span>
          ))}
        </div>

        {/* Past Event Info */}
        {!isUpcoming && event.attendees && (
          <div className="mb-4 text-sm">
            <div className="text-gray-500 mb-1">Attendance</div>
            <div className="text-white">{event.attendees} people</div>
          </div>
        )}

        {/* CTA Button */}
        {isUpcoming && event.ticketUrl ? (
          <a
            href={event.ticketUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="neon-button w-full py-3 bg-gradient-to-r from-[#b983ff] to-[#ff80df] rounded-full font-bold flex items-center justify-center gap-2"
          >
            <Ticket className="w-5 h-5" />
            buy on kartis
            <ExternalLink className="w-4 h-4" />
          </a>
        ) : (
          <div className="w-full py-3 bg-white/5 rounded-full font-bold text-center text-gray-500">
            Event Ended
          </div>
        )}
      </div>
    </motion.div>
  );
}

function LinkCard({ title, description, url, icon, color }: { title: string; description: string; url: string; icon: string; color: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="p-6 rounded-xl bg-white/5 hover:bg-white/10 transition-colors group"
    >
      <div className="text-3xl mb-3">{icon}</div>
      <h3 className="text-lg font-bold mb-2 group-hover:text-[#b983ff] transition-colors">{title}</h3>
      <p className="text-gray-400 text-sm mb-3">{description}</p>
      <div className="flex items-center gap-2 text-sm font-medium" style={{ color }}>
        Visit Link
        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
      </div>
    </a>
  );
}
