"use client";

import React, { useState, useEffect, ReactNode } from "react";
import {
  Download,
  Star,
  Zap,
  Heart,
  Play,
  Check,
  ArrowRight,
  LinkIcon,
  Video,
  Folder,
  Moon,
  Clipboard,
  Settings,
  Bell,
  ExternalLink,
} from "lucide-react";

// Reusable Hero Component

interface HeroSectionProbe {
  subtitle: string;
  description: string;
  primaryCTA: string;
  secondaryCTA: string;
  stats: Array<Record<any, any>>;
  backgroundGradient: string;
}

export const HeroSection = ({
  subtitle,
  description,
  primaryCTA,
  secondaryCTA,
  stats,
  backgroundGradient = "from-slate-50 via-blue-50 to-indigo-100",
}: HeroSectionProbe) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <section
      className={`relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br ${backgroundGradient}`}
    >
      {/* ✨ Animated Background Blobs ✨ */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-40%] right-[-40%] w-[60rem] h-[60rem] bg-gradient-to-br from-indigo-400/30 to-teal-600/30 rounded-full blur-[120px] animate-pulse"></div>
        <div
          className="absolute bottom-[-40%] left-[-40%] w-[60rem] h-[60rem] bg-gradient-to-tr from-cyan-400/30 to-blue-600/30 rounded-full blur-[120px] animate-pulse"
          style={{ animationDelay: "2s" }}
        ></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 text-center flex flex-col items-center">
        <div
          className={`transition-all duration-1000 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
          }`}
        >
          {/* ✨ Centerpiece App Icon with Glow ✨ */}
          <div className="mb-8 relative group flex justify-center mt-8">
            <div className="absolute w-60 h-60 rounded-[2rem] bg-gradient-to-r from-indigo-500 to-teal-600 opacity-30 blur-2xl group-hover:opacity-50 transition duration-500"></div>
            <img
              src="icon.svg"
              alt="App Icon"
              className="relative w-48 h-48 rounded-[2rem] p-6 shadow-2xl hover:scale-105 transition-transform duration-500"
            />
          </div>

          {/* ✨ Logo under the icon ✨ */}
          <h1 className="mb-6 flex justify-center">
            <img
              src="icon2-black.png"
              alt="Logo"
              className="w-[20rem] max-w-full hover:scale-105 transition-transform duration-500 drop-shadow-lg"
            />
          </h1>

          {/* ✨ Subtitle ✨ */}
          <p className="text-2xl md:text-3xl text-gray-800 mb-4 font-bold tracking-tight">
            {subtitle}
          </p>

          {/* ✨ Description ✨ */}
          <p className="text-lg md:text-xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
            {description}
          </p>

          {/* ✨ Stats ✨ */}
          {stats && (
            <div className="flex flex-wrap justify-center gap-8 mb-12">
              {stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="text-4xl font-extrabold text-gray-900">
                    {stat.value}
                  </div>
                  <div className="text-gray-500">{stat.label}</div>
                </div>
              ))}
            </div>
          )}

          {/* ✨ CTA Buttons ✨ */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <a href="https://github.com/mahirox36/Mihari/releases/latest">
              <button className="group cursor-pointer bg-gradient-to-r from-indigo-500 to-teal-400 hover:from-indigo-600 hover:to-teal-500 text-white px-8 py-4 rounded-2xl font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-2xl flex items-center space-x-2">
                <Download className="w-5 h-5" />
                <span>{primaryCTA}</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </a>

            {secondaryCTA && (
              <a href="https://github.com/mahirox36/Mihari/">
                <button className="group cursor-pointer bg-white/90 backdrop-blur-sm hover:bg-white text-gray-700 px-8 py-4 rounded-2xl font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-2xl flex items-center space-x-2 border border-gray-200">
                  <Play className="w-5 h-5" />
                  <span>{secondaryCTA}</span>
                </button>
              </a>
            )}
          </div>

          {/* ✨ Platform Badge ✨ */}
          <div className="flex justify-center space-x-6 opacity-70 text-sm md:text-base">
            <div className="text-gray-500">
              Available for Windows (Mac & Linux coming soon)
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

interface FeatureCardProbe {
  icon: any;
  title: string;
  description: string;
  color: string;
  isActive: boolean;
  onClick: any;
}

// Reusable Feature Card Component
export const FeatureCard = ({
  icon: Icon,
  title,
  description,
  color,
  isActive,
  onClick,
}: FeatureCardProbe) => (
  <div
    className={`p-8 rounded-2xl border-2 transition-all duration-500 cursor-pointer ${
      isActive
        ? "border-indigo-500 bg-gradient-to-br from-indigo-50 to-teal-50 transform scale-105 shadow-xl"
        : "border-gray-200 hover:border-gray-300 hover:shadow-lg"
    }`}
    onClick={onClick}
  >
    <div
      className={`w-12 h-12 rounded-xl bg-gradient-to-r ${color} flex items-center justify-center mb-6`}
    >
      <Icon className="w-6 h-6 text-white" />
    </div>
    <h3 className="text-2xl font-bold text-gray-900 mb-4">{title}</h3>
    <p className="text-gray-600 leading-relaxed">{description}</p>
  </div>
);

interface TestimonialCardProbe {
  name: string;
  rating: number;
  text: string;
  avatar: ReactNode;
  platform: string;
}

// Reusable Testimonial Component
export const TestimonialCard = ({
  name,
  rating,
  text,
  avatar,
  platform,
}: TestimonialCardProbe) => (
  <div className="bg-gray-50 p-8 rounded-2xl hover:shadow-lg transition-shadow duration-300">
    <div className="flex items-center mb-4">
      <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold mr-4 overflow-hidden shadow-lg">
        {avatar}
      </div>
      <div>
        <div className="font-semibold text-gray-900">{name}</div>
        <div className="flex items-center">
          {[...Array(rating)].map((_, i) => (
            <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
          ))}
          <span className="ml-2 text-sm text-gray-500">{platform}</span>
        </div>
      </div>
    </div>
    <p className="text-gray-600 italic">"{text}"</p>
  </div>
);

// Main Landing Page Component
export default function MihariLandingPage() {
  const [activeFeature, setActiveFeature] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveFeature((prev) => (prev + 1) % 6);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  const features = [
    {
      icon: Video,
      title: "Universal Downloads",
      description:
        "Download from thousands of platforms including YouTube, TikTok, Instagram, and many more with yt-dlp power.",
      color: "from-red-500 to-pink-500",
    },
    {
      icon: Zap,
      title: "Lightning Fast",
      description:
        "Built with AsyncYT for maximum performance. Download multiple files simultaneously without slowing down.",
      color: "from-yellow-400 to-orange-500",
    },
    {
      icon: Settings,
      title: "Highly Customizable",
      description:
        "Choose format, quality, subtitles, metadata, thumbnails. Mihari adapts to your exact needs.",
      color: "from-blue-500 to-cyan-500",
    },
    {
      icon: LinkIcon,
      title: "Multiple Links",
      description:
        "Paste several URLs at once and Mihari will download them all simultaneously. Perfect for playlists!",
      color: "from-green-500 to-teal-500",
    },
    {
      icon: Clipboard,
      title: "Clipboard Magic",
      description:
        "Auto-detects and pastes links when you launch the app. No manual copying needed!",
      color: "from-purple-500 to-indigo-500",
    },
    {
      icon: Moon,
      title: "Beautiful Themes",
      description:
        "Light mode for sunny days, dark mode for cozy nights. Built with React + TypeScript for smooth experience.",
      color: "from-gray-700 to-gray-900",
    },
  ];

  const testimonials = [
    {
      name: "Hans",
      rating: 5,
      text: "This app is peak! I always used to struggle with downloading videos from well‑known sites, but with Mihari I don’t struggle anymore. With just three simple clicks, I can download playlists in any codec I like—and in the best quality too. It’s a total game changer!",
      avatar: <img src="hans.jpg" className="object-cover w-full h-full" />,
      platform: "Beta Tester",
    },
    {
      name: "Michel Jackson",
      rating: 5,
      text: "Hee hee",
      avatar: (
        <img
          src="data:image/jpeg;base64,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"
          className="object-cover w-full h-full"
        />
      ),
      platform: "tf?",
    },
    {
      name: "Kasane Teto",
      rating: 5,
      text: "TeTeTeTeTeteto TeTeTeTeTeteto Teto Kasane Teto Teto Kasane Teto TeTeTeTeTeteto TeTeTeTeTeteto Teto Teto Kasane Teto",
      avatar: (
        <img
          src="https://art.ngfiles.com/images/6685000/6685273_2001833_pinklemone_untitled-6685273.87f99f8e621c38718d0b5777453c30d4.webp?f1747002441"
          className="object-cover w-full h-full"
        />
      ),
      platform: "Fuck Miku",
    },
  ];

  const stats = [
    { value: "10+", label: "Downloads" },
    { value: "5.0", label: "Rating" },
    { value: "Beta", label: "Status" },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <HeroSection
        subtitle="Your Adorable Video & Audio Downloader 💖"
        description="Sleek, fast, and super customizable media downloader powered by yt-dlp. Download from anywhere with cute vibes and powerful features! ✨"
        primaryCTA="Download Beta (Windows)"
        secondaryCTA="View on GitHub"
        stats={stats}
        backgroundGradient="from-pink-50 via-purple-50 to-indigo-100"
      />

      {/* Features Section */}
      <section className="py-20 bg-white" id="about">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              ✨ Why Choose Mihari?
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Power and personality combined. Download anything from anywhere
              with style! 🌟
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <FeatureCard
                key={index}
                icon={feature.icon}
                title={feature.title}
                description={feature.description}
                color={feature.color}
                isActive={activeFeature === index}
                onClick={() => setActiveFeature(index)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Demo Section */}
      <section className="py-20 bg-gradient-to-br from-gray-50 to-indigo-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              🎬 See Mihari in Action
            </h2>
            <p className="text-xl text-gray-600">
              Beautiful interface meets powerful functionality
            </p>
          </div>

          <div className="relative max-w-5xl mx-auto">
            {/* Desktop App Mockup */}
            <div className="overflow-hidden rounded-2xl shadow-2xl inline-block">
              <img src="app.png" alt="App" className="block w-full h-auto" />
            </div>

            {/* Feature Highlights */}
            <div className="grid md:grid-cols-2 gap-6 mt-8">
              <div className="bg-white rounded-xl p-6 shadow-lg">
                <div className="flex items-center mb-4">
                  <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-teal-500 rounded-lg flex items-center justify-center mr-3">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="font-bold text-gray-900">
                    One-Click Downloads
                  </h3>
                </div>
                <p className="text-gray-600 text-sm">
                  Paste your link and hit download. That's it! Mihari handles
                  the rest.
                </p>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-lg">
                <div className="flex items-center mb-4">
                  <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center mr-3">
                    <Heart className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="font-bold text-gray-900">Cute & Powerful</h3>
                </div>
                <p className="text-gray-600 text-sm">
                  Adorable interface with enterprise-grade performance. Best of
                  both worlds!
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              💖 What Beta Testers Say
            </h2>
            <p className="text-xl text-gray-600">
              Real feedback from real users who tested Mihari
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <TestimonialCard
                key={index}
                name={testimonial.name}
                rating={testimonial.rating}
                text={testimonial.text}
                avatar={testimonial.avatar}
                platform={testimonial.platform}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Coming Soon Section */}
      <section className="py-20 bg-gradient-to-br from-indigo-50 to-teal-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              🌸 Coming Soon
            </h2>
            <p className="text-xl text-gray-600">
              Even more features to make Mihari perfect!
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white rounded-xl p-6 shadow-lg text-center">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Folder className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-bold text-gray-900 mb-2">Drag & Drop</h3>
              <p className="text-gray-600 text-sm">
                Drop .txt/.csv files with links for bulk downloads
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-lg text-center">
              <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-teal-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Bell className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-bold text-gray-900 mb-2">System Tray</h3>
              <p className="text-gray-600 text-sm">
                Quick access from your system tray with instant actions
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-lg text-center">
              <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-bold text-gray-900 mb-2">
                Keyboard Shortcuts
              </h3>
              <p className="text-gray-600 text-sm">
                Lightning-fast navigation with custom hotkeys
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Download CTA Section */}
      <section className="py-20 bg-gradient-to-r from-indigo-600 via-blue-500 to-teal-400">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to Download with Style? 🌸
          </h2>
          <p className="text-xl text-pink-100 mb-8">
            Join the beta testers who are already loving Mihari's cute vibes and
            powerful features!
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="https://github.com/mahirox36/Mihari/releases/latest"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white text-pink-600 px-8 py-4 rounded-2xl font-semibold hover:bg-gray-50 transition-all duration-300 transform hover:scale-105 shadow-lg flex items-center justify-center space-x-2"
            >
              <Download className="w-5 h-5" />
              <span>Download Mihari-Setup.exe</span>
            </a>

            <a
              href="https://github.com/mahirox36/Mihari"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white/10 backdrop-blur-sm text-white px-8 py-4 rounded-2xl font-semibold hover:bg-white/20 transition-all duration-300 transform hover:scale-105 shadow-lg border border-white/20 flex items-center justify-center space-x-2"
            >
              <ExternalLink className="w-5 h-5" />
              <span>View on GitHub</span>
            </a>
          </div>

          <p className="text-pink-100 text-sm mt-6">
            Windows only • Mac & Linux coming in final release • MIT License
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="text-2xl font-bold mb-4">🌸 Mihari</div>
              <p className="text-gray-400">
                Your adorable video & audio downloader with personality and
                power! 💖
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Downloads</h4>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <a
                    href="https://github.com/mahirox36/Mihari/releases/latest"
                    className="hover:text-white transition-colors"
                  >
                    Windows Beta
                  </a>
                </li>
                <li>
                  <span className="text-gray-600">Mac (Coming Soon)</span>
                </li>
                <li>
                  <span className="text-gray-600">Linux (Coming Soon)</span>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Development</h4>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <a
                    href="https://github.com/mahirox36/Mihari"
                    className="hover:text-white transition-colors"
                  >
                    Source Code
                  </a>
                </li>
                <li>
                  <a
                    href="https://github.com/mahirox36/asyncyt"
                    className="hover:text-white transition-colors"
                  >
                    AsyncYT Engine
                  </a>
                </li>
                <li>
                  <a
                    href="https://github.com/yt-dlp/yt-dlp"
                    className="hover:text-white transition-colors"
                  >
                    yt-dlp
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <a
                    href="https://github.com/mahirox36/Mihari/issues"
                    className="hover:text-white transition-colors"
                  >
                    Report Issues
                  </a>
                </li>
                <li>
                  <a
                    href="https://github.com/mahirox36/Mihari/discussions"
                    className="hover:text-white transition-colors"
                  >
                    Discussions
                  </a>
                </li>
                <li>
                  {/* <Link href="#" className="hover:text-white transition-colors">
                    Beta Feedback
                  </Link> */}
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>
              &copy; 2025 Mihari. Licensed under MIT License.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
