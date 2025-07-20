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
  <div className="bg-white p-6 rounded-2xl hover:shadow-lg transition-shadow duration-300 min-w-[350px] max-w-[350px] flex-shrink-0 shadow-md">
    <div className="flex items-center mb-4">
      <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold mr-4 overflow-hidden shadow-lg flex-shrink-0">
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
    <p className="text-gray-600 italic text-sm leading-relaxed">"{text}"</p>
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
      avatar: (
        <img
          src="hans.jpg"
          className="object-cover w-full h-full"
          loading="lazy"
          alt="Hans"
        />
      ),
      platform: "Beta Tester",
    },
    {
      name: "Mr Meroz",
      rating: 5,
      text: "The app is excellent, there are no ads, and it doesn’t force you to download lower quality like other apps or websites. It really helped me a lot in downloading all clips and videos in high quality, and it doesn’t require any subscription. Thank you to the developer for providing a solution to this widespread problem. My honest rating for the app is 10/10, and I highly recommend it, it will be super useful for you!",
      avatar: (
        <img
          src="meroz.png"
          className="object-cover w-full h-full"
          loading="lazy"
          alt="Meroz"
        />
      ),
      platform: "Beta Tester",
    },
    {
      name: "Shadow",
      rating: 5,
      text: "I'm so happy to use this app, it's incredibly fast and simple, even your grandma can use it!",
      avatar: (
        <img
          src="shadow.jpg"
          className="object-cover w-full h-full"
          loading="lazy"
          alt="Shadow"
        />
      ),
      platform: "Beta Tester",
    },
    {
      name: "Anas",
      rating: 5,
      text: "Good app.",
      avatar: (
        <img
          src="anas.webm"
          className="object-cover w-full h-full"
          loading="lazy"
          alt="Anas"
        />
      ),
      platform: "Beta Tester",
    },
    {
      name: "Kasane Teto",
      rating: 5,
      text: "TeTeTeTeTeteto TeTeTeTeTeteto Teto Kasane Teto Teto Kasane Teto TeTeTeTeTeteto TeTeTeTeTeteto Teto Kasane Teto Teto Kasane Teto",
      avatar: (
        <img
          src="https://art.ngfiles.com/images/6685000/6685273_2001833_pinklemone_untitled-6685273.87f99f8e621c38718d0b5777453c30d4.webp?f1747002441"
          className="object-cover w-full h-full"
          loading="lazy"
          alt="Teto"
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
        backgroundGradient="from-blue-50 via-teal-50 to-indigo-100"
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
            <div className="overflow-hidden rounded-2xl shadow-2xl inline-block">
              <img src="app.png" alt="App" className="block w-full h-auto" loading="lazy" />
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

          <div className="relative overflow-hidden group ">
            <div
              className="flex gap-6 animate-marquee group-hover:paused"
              style={{
                width: `${testimonials.length * 2 * 368}px`,
              }}
            >
              {testimonials.concat(testimonials).map((testimonial, index) => (
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
          <p className="text-xl text-blue-100 mb-8">
            Join the beta testers who are already loving Mihari's cute vibes and
            powerful features!
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="https://github.com/mahirox36/Mihari/releases/latest"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white text-cyan-600 px-8 py-4 rounded-2xl font-semibold hover:bg-gray-50 transition-all duration-300 transform hover:scale-105 shadow-lg flex items-center justify-center space-x-2"
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

          <p className="text-blue -100 text-sm mt-6">
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
            <p>&copy; 2025 Mihari. Licensed under MIT License.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
