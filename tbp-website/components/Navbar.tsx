'use client';

import { motion } from 'framer-motion';
import { Sparkles, Menu, X } from 'lucide-react';
import { useState } from 'react';
import Link from 'next/link';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 px-4 py-4">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="glass rounded-full px-6 py-3"
          >
            <div className="flex items-center justify-between">
              {/* Logo */}
              <Link href="/" className="flex items-center gap-2 group">
                <Sparkles className="w-6 h-6 text-[#b983ff] group-hover:rotate-12 transition-transform" />
                <span className="font-bold text-lg hidden sm:block">THE BEST PARTIES</span>
              </Link>
              
              {/* Desktop Navigation */}
              <div className="hidden md:flex items-center gap-8">
                <NavLink href="/">Home</NavLink>
                <NavLink href="/events">Events</NavLink>
                <NavLink href="/#contact">Contact</NavLink>
                <a
                  href="https://www.instagram.com/thebestparties.ofc"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-300 hover:text-white transition-colors font-medium"
                >
                  Instagram
                </a>
                <motion.a
                  href="/events"
                  className="px-6 py-2 bg-gradient-to-r from-[#b983ff] to-[#ff80df] rounded-full font-bold text-sm neon-button"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Get Tickets
                </motion.a>
              </div>
              
              {/* Mobile Menu Button */}
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="md:hidden p-2 text-gray-300 hover:text-white"
              >
                {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </motion.div>
        </div>
      </nav>
      
      {/* Mobile Menu */}
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed inset-0 z-40 bg-[#0a0a0f]/95 backdrop-blur-lg md:hidden pt-24 px-4"
        >
          <div className="flex flex-col gap-6 text-center">
            <MobileNavLink href="/" onClick={() => setIsOpen(false)}>Home</MobileNavLink>
            <MobileNavLink href="/events" onClick={() => setIsOpen(false)}>Events</MobileNavLink>
            <MobileNavLink href="/#contact" onClick={() => setIsOpen(false)}>Contact</MobileNavLink>
            <a
              href="https://www.instagram.com/thebestparties.ofc"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setIsOpen(false)}
              className="text-2xl font-medium text-gray-300 hover:text-white transition-colors"
            >
              Instagram
            </a>
            <a
              href="/events"
              onClick={() => setIsOpen(false)}
              className="mx-auto px-8 py-4 bg-gradient-to-r from-[#b983ff] to-[#ff80df] rounded-full font-bold text-lg neon-button"
            >
              Get Tickets
            </a>
          </div>
        </motion.div>
      )}
    </>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="text-gray-300 hover:text-white transition-colors font-medium relative group"
    >
      {children}
      <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-[#b983ff] to-[#ff80df] group-hover:w-full transition-all duration-300" />
    </Link>
  );
}

function MobileNavLink({ href, children, onClick }: { href: string; children: React.ReactNode; onClick: () => void }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="text-2xl font-medium text-gray-300 hover:text-white transition-colors"
    >
      {children}
    </Link>
  );
}
