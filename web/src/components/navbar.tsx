"use client";

import React, { useEffect, useState } from "react";
import {
  Menu,
  X,
  Github,
  Info,
  HelpCircle,
} from "lucide-react";
import Link from "next/link";

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Scroll effect for navbar background
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navItems = [
    // {
    //   href: '/download',
    //   label: 'Download',
    //   icon: Download,
    //   description: 'Get the latest version'
    // },
    {
      href: "#about",
      label: "About",
      icon: Info,
      description: "Learn more about us",
    },
    {
      href: "https://github.com/mahirox36/Mihari/",
      label: "GitHub",
      icon: Github,
      description: "View our source code",
    },
    {
      href: "https://github.com/mahirox36/Mihari/issues",
      label: "Help",
      icon: HelpCircle,
      description: "Get support",
    },
  ];

  return (
    <>
      {/* Navbar */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ease-out ${
          isScrolled
            ? "bg-white/80 backdrop-blur-xl shadow-lg border-b border-gray-200/50"
            : "bg-gradient-to-r from-indigo-600 via-blue-500 to-teal-400"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo Section */}
            <div className="flex items-center group">
              <Link
                href="/"
                className="flex items-center space-x-3 transform transition-all duration-300 hover:scale-105"
              >
                <div className="relative">
                  {/* Animated logo background */}
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-pink-400 rounded-xl blur-lg opacity-30 group-hover:opacity-50 transition-opacity duration-300 animate-pulse"></div>
                  <div className="relative bg-white/10 backdrop-blur-sm rounded-xl p-2 border border-white/20">
                    <img className="w-32" src="icon2.png" alt="" />
                  </div>
                </div>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-1">
              {navItems.map((item, index) => (
                <div key={item.href} className="relative group">
                  <Link
                    href={item.href}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition-all duration-300 transform hover:scale-105 ${
                      isScrolled
                        ? "text-gray-700 hover:text-indigo-600 hover:bg-indigo-50"
                        : "text-white/90 hover:text-white hover:bg-white/10"
                    } backdrop-blur-sm`}
                    style={{
                      animationDelay: `${index * 100}ms`,
                      animation: "slideInFromTop 0.6s ease-out forwards",
                    }}
                  >
                    <item.icon className="w-4 h-4" />
                    <span className="font-medium">{item.label}</span>
                  </Link>

                  {/* Tooltip */}
                  <div className="absolute top-full mt-2 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none whitespace-nowrap">
                    {item.description}
                  </div>
                </div>
              ))}
            </div>

            {/* CTA Button */}
            <div className="hidden md:flex items-center space-x-4">
              <button
                className={`px-6 py-2 rounded-xl font-medium transition-all duration-300 transform hover:scale-105 hover:shadow-lg ${
                  isScrolled
                    ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700"
                    : "bg-white text-indigo-600 hover:bg-gray-50"
                }`}
              >
                Download Now
              </button>
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className={`p-2 rounded-xl transition-all duration-300 ${
                  isScrolled
                    ? "text-gray-700 hover:bg-gray-100"
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

        {/* Mobile Menu */}
        <div
          className={`md:hidden transition-all duration-300 ease-out ${
            isMobileMenuOpen
              ? "max-h-screen opacity-100"
              : "max-h-0 opacity-0 overflow-hidden"
          }`}
        >
          <div className="px-4 pt-2 pb-4 space-y-2 bg-white/95 backdrop-blur-xl border-t border-gray-200/50">
            {navItems.map((item, index) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center space-x-3 px-4 py-3 rounded-xl text-gray-700 hover:text-indigo-600 hover:bg-indigo-50 transition-all duration-200"
                style={{
                  animationDelay: `${index * 50}ms`,
                  animation: isMobileMenuOpen
                    ? "slideInFromLeft 0.4s ease-out forwards"
                    : "none",
                }}
              >
                <item.icon className="w-5 h-5" />
                <div>
                  <div className="font-medium">{item.label}</div>
                  <div className="text-xs text-gray-500">
                    {item.description}
                  </div>
                </div>
              </Link>
            ))}
            <div className="pt-4 border-t border-gray-200">
              <button className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-3 rounded-xl font-medium hover:from-indigo-700 hover:to-purple-700 transition-all duration-300">
                Get Started
              </button>
            </div>
          </div>
        </div>
      </nav>

      <style jsx>{`
        @keyframes slideInFromTop {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slideInFromLeft {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </>
  );
}
