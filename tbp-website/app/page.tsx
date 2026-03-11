'use client';

import { motion } from 'framer-motion';
import { Instagram, Ticket, Sparkles, Music, Users, ArrowRight, Mail } from 'lucide-react';
import ParticleBackground from '@/components/ParticleBackground';
import Link from 'next/link';

export default function Home() {
  return (
    <main className="relative min-h-screen">
      <ParticleBackground />
      
      {/* Hero Section */}
      <section className="min-h-screen flex items-center justify-center px-4 py-20">
        <div className="max-w-6xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="flex items-center justify-center gap-2 mb-6">
              <Sparkles className="w-6 h-6 text-[#b983ff]" />
              <span className="text-[#ff80df] font-medium tracking-widest text-sm uppercase">
                The Best Parties
              </span>
              <Sparkles className="w-6 h-6 text-[#80ffea]" />
            </div>
            
            <h1 className="text-6xl md:text-8xl font-bold mb-6 leading-tight">
              <span className="gradient-text">Go with your</span>
              <br />
              <span className="text-white neon-text">heart ❤️ 🎉</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-300 mb-12 max-w-2xl mx-auto">
              Your gateway to the most unforgettable nightlife experiences. 
              We don&apos;t just throw parties — we create moments that last forever.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <motion.a
                href="https://www.instagram.com/thebestparties.ofc"
                target="_blank"
                rel="noopener noreferrer"
                className="neon-button px-8 py-4 bg-gradient-to-r from-[#b983ff] to-[#ff80df] rounded-full font-bold text-lg flex items-center justify-center gap-2"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Instagram className="w-5 h-5" />
                Follow on Instagram
              </motion.a>
              
              <Link href="/events">
                <motion.div
                  className="neon-button px-8 py-4 glass rounded-full font-bold text-lg flex items-center justify-center gap-2 cursor-pointer"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Explore Events
                  <ArrowRight className="w-5 h-5" />
                </motion.div>
              </Link>
            </div>
          </motion.div>
          
          {/* Scroll indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 0.5 }}
            className="absolute bottom-10 left-1/2 -translate-x-1/2"
          >
            <motion.div
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-6 h-10 border-2 border-[#b983ff] rounded-full flex justify-center pt-2"
            >
              <motion.div className="w-1 h-2 bg-[#b983ff] rounded-full" />
            </motion.div>
          </motion.div>
        </div>
      </section>
      
      {/* Features Section */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="grid md:grid-cols-3 gap-8"
          >
            <FeatureCard
              icon={<Music className="w-8 h-8" />}
              title="World-Class DJs"
              description="Experience performances from the biggest names in electronic music and emerging talent."
              color="#b983ff"
            />
            <FeatureCard
              icon={<Users className="w-8 h-8" />}
              title="Electric Crowds"
              description="Join a community of party enthusiasts who live for the music and the moment."
              color="#ff80df"
            />
            <FeatureCard
              icon={<Sparkles className="w-8 h-8" />}
              title="Unforgettable Vibes"
              description="Immersive production, stunning visuals, and energy that keeps you moving all night."
              color="#80ffea"
            />
          </motion.div>
        </div>
      </section>
      
      {/* Partners Section */}
      <section id="events" className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              <span className="gradient-text">Our Partners</span>
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              We collaborate with the best hospitality groups to bring you premium experiences.
            </p>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="grid md:grid-cols-2 gap-8"
          >
            <PartnerCard
              name="Dream Hospitality Group"
              description="Premium ticketing and exclusive event access"
              cta="Get Tickets"
              href="https://tickets.dreamhospitalitygroup.com/promoter/67acd1fc-c56c-43bb-9b62-003a0a1e6008?utm_source=promoter&utm_id=67acd1fc894840f0a3d8003a0a1e6008"
              color="#b983ff"
            />
            <PartnerCard
              name="Vibe Hospitality Group"
              description="Curated nightlife experiences and VIP access"
              cta="Explore Events"
              href="https://www.vibestub.com/promoter/670d48fb-043c-4f07-a87d-516c0ad1214d?utm_source=promoter&utm_id=670d48fb53e44657821d516c0ad1214d"
              color="#ff80df"
            />
          </motion.div>
        </div>
      </section>
      
      {/* Stats Section */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              <span className="gradient-text">By the Numbers</span>
            </h2>
            <p className="text-gray-400 text-lg">The proof is in the party.</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-6"
          >
            <StatCard number="10K+" label="Happy Attendees" color="#b983ff" />
            <StatCard number="50+" label="Events Hosted" color="#ff80df" />
            <StatCard number="3" label="Cities" color="#80ffea" />
            <StatCard number="100%" label="Unforgettable" color="#b983ff" />
          </motion.div>
        </div>
      </section>

      {/* Contact / Booking Section */}
      <section id="contact" className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="glass rounded-3xl p-12 text-center"
          >
            <div className="absolute inset-0 pointer-events-none" />
            <Mail className="w-14 h-14 mx-auto mb-6 text-[#b983ff]" />
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              <span className="gradient-text">Book an Event</span>
            </h2>
            <p className="text-gray-300 text-lg mb-10 max-w-xl mx-auto">
              Private events, corporate parties, or VIP experiences — let&apos;s make something unforgettable together.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <motion.a
                href="mailto:contact@thebestparties.ofc"
                className="neon-button px-8 py-4 bg-gradient-to-r from-[#b983ff] to-[#ff80df] rounded-full font-bold text-lg flex items-center justify-center gap-2"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Mail className="w-5 h-5" />
                Email Us
              </motion.a>
              <motion.a
                href="https://www.instagram.com/thebestparties.ofc"
                target="_blank"
                rel="noopener noreferrer"
                className="neon-button px-8 py-4 glass rounded-full font-bold text-lg flex items-center justify-center gap-2"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Instagram className="w-5 h-5" />
                DM on Instagram
              </motion.a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="glass rounded-3xl p-12 text-center relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-[#b983ff]/10 to-[#ff80df]/10" />
            <div className="relative z-10">
              <Ticket className="w-16 h-16 mx-auto mb-6 text-[#80ffea]" />
              <h2 className="text-4xl md:text-5xl font-bold mb-4">
                Ready to <span className="gradient-text">Experience</span> the Night?
              </h2>
              <p className="text-gray-300 text-lg mb-8 max-w-xl mx-auto">
                Follow us on Instagram for the latest event announcements, exclusive presales, and behind-the-scenes content.
              </p>
              <motion.a
                href="https://www.instagram.com/thebestparties.ofc"
                target="_blank"
                rel="noopener noreferrer"
                className="neon-button inline-flex items-center gap-2 px-10 py-5 bg-gradient-to-r from-[#b983ff] to-[#ff80df] rounded-full font-bold text-xl pulse-glow"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Instagram className="w-6 h-6" />
                @thebestparties.ofc
              </motion.a>
            </div>
          </motion.div>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="py-12 px-4 border-t border-white/10">
        <div className="max-w-6xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-[#b983ff]" />
            <span className="font-bold text-lg">THE BEST PARTIES</span>
            <Sparkles className="w-5 h-5 text-[#80ffea]" />
          </div>
          <p className="text-gray-500 text-sm">
            © {new Date().getFullYear()} The Best Parties. All rights reserved.
          </p>
          <p className="text-gray-600 text-xs mt-2">
            Go with your heart ❤️ 🎉
          </p>
        </div>
      </footer>
    </main>
  );
}

function FeatureCard({ icon, title, description, color }: { icon: React.ReactNode; title: string; description: string; color: string }) {
  return (
    <motion.div
      whileHover={{ y: -10 }}
      className="glass rounded-2xl p-8 text-center group"
    >
      <div 
        className="w-16 h-16 mx-auto mb-6 rounded-full flex items-center justify-center"
        style={{ background: `${color}20`, color }}
      >
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-3">{title}</h3>
      <p className="text-gray-400">{description}</p>
    </motion.div>
  );
}

function StatCard({ number, label, color }: { number: string; label: string; color: string }) {
  return (
    <motion.div
      whileHover={{ y: -6 }}
      className="glass rounded-2xl p-8 text-center"
    >
      <div className="text-4xl md:text-5xl font-bold mb-2" style={{ color }}>{number}</div>
      <div className="text-gray-400 text-sm uppercase tracking-wider">{label}</div>
    </motion.div>
  );
}

function PartnerCard({ name, description, cta, href, color }: { name: string; description: string; cta: string; href: string; color: string }) {
  return (
    <motion.a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      whileHover={{ scale: 1.02 }}
      className="glass rounded-2xl p-8 block group"
    >
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-2xl font-bold">{name}</h3>
        <ArrowRight className="w-6 h-6 text-gray-400 group-hover:text-white transition-colors" />
      </div>
      <p className="text-gray-400 mb-6">{description}</p>
      <span 
        className="inline-block px-6 py-3 rounded-full font-medium text-sm"
        style={{ background: `${color}20`, color }}
      >
        {cta}
      </span>
    </motion.a>
  );
}
