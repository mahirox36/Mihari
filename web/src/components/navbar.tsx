"use client";

import React, { useEffect, useState } from "react";
import {
  Menu,
  X,
  Github,
  Info,
  HelpCircle,
  Moon,
  Sun,
  Download,
} from "lucide-react";
import Link from "next/link";
import { useDarkMode } from "./Hero";

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { dark, toggle } = useDarkMode();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close mobile menu on route change / outside click
  useEffect(() => {
    if (isMobileMenuOpen) {
      const close = () => setIsMobileMenuOpen(false);
      document.addEventListener("click", close, { once: true });
    }
  }, [isMobileMenuOpen]);

  const navItems = [
    {
      href: "#about",
      label: "About",
      icon: Info,
      description: "Learn more about Mihari",
    },
    {
      href: "#readme",
      label: "Docs",
      icon: HelpCircle,
      description: "FAQ & documentation",
    },
    {
      href: "https://github.com/mahirox36/Mihari/",
      label: "GitHub",
      icon: Github,
      description: "View source code",
    },
  ];

  const scrolled = isScrolled;

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ease-out ${
          scrolled
            ? "bg-white/90 dark:bg-gray-950/90 backdrop-blur-xl shadow-sm border-b border-gray-200/50 dark:border-gray-800/50"
            : "bg-linear-to-r from-indigo-600 via-blue-500 to-teal-400 dark:from-indigo-800 dark:via-blue-700 dark:to-teal-600"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link
              href="/"
              className="flex items-center space-x-3 group transition-all duration-300 hover:scale-105"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-linear-to-r from-purple-400 to-pink-400 rounded-xl blur-lg opacity-30 group-hover:opacity-50 transition-opacity duration-300 animate-pulse" />
                <div className="relative bg-white/10 dark:bg-white/5 backdrop-blur-sm rounded-xl p-2 border border-white/20">
                  <img
                    className="w-28"
                    src={scrolled && !dark ? "icon2-black.png" : "icon2.png"}
                    alt="Mihari"
                  />
                </div>
              </div>
            </Link>

            {/* Desktop nav */}
            <div className="hidden md:flex items-center gap-1">
              {navItems.map((item) => (
                <div key={item.href} className="relative group">
                  <Link
                    href={item.href}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-200 text-sm font-medium ${
                      scrolled
                        ? "text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950"
                        : "text-white/90 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                  {/* Tooltip */}
                  <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-gray-900 dark:bg-gray-700 text-white text-xs px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                    {item.description}
                  </div>
                </div>
              ))}
            </div>

            {/* Right side: dark toggle + CTA */}
            <div className="hidden md:flex items-center gap-3">
              {/* Dark mode toggle */}
              {/*<button
                onClick={toggle}
                aria-label="Toggle dark mode"
                className={`p-2 rounded-xl transition-all duration-300 hover:scale-105 ${
                  scrolled
                    ? "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                    : "text-white/80 hover:text-white hover:bg-white/10"
                }`}
              >
                {dark ? (
                  <Sun className="w-5 h-5" />
                ) : (
                  <Moon className="w-5 h-5" />
                )}
              </button>*/}

              <a
                href="https://github.com/mahirox36/Mihari/releases/latest"
                target="_blank"
                rel="noopener noreferrer"
              >
                <button
                  className={`flex items-center gap-2 px-5 py-2 rounded-xl font-medium text-sm transition-all duration-300 hover:scale-105 hover:shadow-md ${
                    scrolled
                      ? "bg-linear-to-r from-indigo-600 to-teal-500 text-white hover:from-indigo-700 hover:to-teal-600"
                      : "bg-white text-indigo-600 hover:bg-gray-50"
                  }`}
                >
                  <Download className="w-4 h-4" />
                  Download
                </button>
              </a>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden flex items-center gap-2">
              <button
                onClick={toggle}
                aria-label="Toggle dark mode"
                className={`p-2 rounded-xl transition-all duration-300 ${
                  scrolled
                    ? "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                    : "text-white/80 hover:bg-white/10"
                }`}
              >
                {dark ? (
                  <Sun className="w-5 h-5" />
                ) : (
                  <Moon className="w-5 h-5" />
                )}
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMobileMenuOpen(!isMobileMenuOpen);
                }}
                aria-label="Toggle menu"
                className={`p-2 rounded-xl transition-all duration-300 ${
                  scrolled
                    ? "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                    : "text-white hover:bg-white/10"
                }`}
              >
                {isMobileMenuOpen ? (
                  <X className="w-6 h-6" />
                ) : (
                  <Menu className="w-6 h-6" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        <div
          className={`md:hidden transition-all duration-300 ease-out overflow-hidden ${
            isMobileMenuOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <div
            className="px-4 pt-2 pb-4 space-y-1 bg-white/95 dark:bg-gray-950/95 backdrop-blur-xl border-t border-gray-200/50 dark:border-gray-800/50"
            onClick={(e) => e.stopPropagation()}
          >
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950 transition-all duration-200"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <item.icon className="w-5 h-5" />
                <div>
                  <div className="font-medium text-sm">{item.label}</div>
                  <div className="text-xs text-gray-400 dark:text-gray-500">
                    {item.description}
                  </div>
                </div>
              </Link>
            ))}
            <div className="pt-3 border-t border-gray-200 dark:border-gray-800">
              <a
                href="https://github.com/mahirox36/Mihari/releases/latest"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full bg-linear-to-r from-indigo-600 to-teal-500 text-white px-4 py-3 rounded-xl font-medium text-sm hover:from-indigo-700 hover:to-teal-600 transition-all duration-300"
              >
                <Download className="w-4 h-4" />
                Download now
              </a>
            </div>
          </div>
        </div>
      </nav>
    </>
  );
}
