"use client";

import Link from "next/link";
import { ArrowRight, Menu, X } from "lucide-react";
import { useState } from "react";

const navLinks = [
  { label: "Home", href: "/" },
  { label: "Image", href: "/category/image" },
  { label: "PDF", href: "/category/pdf" },
  { label: "Text", href: "/category/text" },
  { label: "All Tools", href: "/tools" },
];

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md shadow-indigo-200 group-hover:shadow-lg group-hover:shadow-indigo-200 transition-all">
              <span className="text-white font-bold text-sm">P</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-bold text-gray-900">Pro</span>
              <span className="text-xl font-bold text-gradient">Converter</span>
              <span className="text-xs font-semibold text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded-md">
                BD
              </span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-indigo-600 rounded-lg hover:bg-indigo-50/60 transition-all"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/tools"
              className="ml-2 btn-primary !py-2 !px-5 text-sm flex items-center gap-1.5"
            >
              Get Started
              <ArrowRight size={16} />
            </Link>
          </nav>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* Mobile Nav */}
        {mobileOpen && (
          <nav className="md:hidden pb-4 border-t border-gray-100 pt-3 space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="block px-4 py-2.5 text-sm font-medium text-gray-600 hover:text-indigo-600 rounded-lg hover:bg-indigo-50/60 transition-all"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/tools"
              onClick={() => setMobileOpen(false)}
              className="block mx-3 mt-2 btn-primary !py-2.5 text-sm text-center"
            >
              Get Started
            </Link>
          </nav>
        )}
      </div>
    </header>
  );
}
