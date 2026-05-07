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
  Moon,
  Sun,
  Clipboard,
  Settings,
  ExternalLink,
  Bell,
  Save,
  Keyboard,
  BookOpen,
  ChevronDown,
  ListVideo,
} from "lucide-react";

export function useDarkMode() {
  const [dark, setDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("mihari-dark");
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches;

    const initial = stored !== null ? stored === "true" : prefersDark;

    setDark(initial);
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return; // Don't run on first server-side pass

    const root = window.document.documentElement;
    if (dark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("mihari-dark", String(dark));
  }, [dark, mounted]);

  const toggle = () => setDark((prev) => !prev);

  return { dark, toggle, mounted };
}

export function DownloadButton() {
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [os, setOs] = useState<string>("Windows");

  useEffect(() => {
    const detectPlatform = () => {
      const ua = navigator.userAgent.toLowerCase();
      let os = "";
      let arch = "x64";

      if (/windows nt/i.test(ua)) os = "win";
      else if (/macintosh|mac os x/i.test(ua)) os = "mac";
      else if (/linux/i.test(ua)) os = "linux";

      if (os === "win") setOs("Windows");
      else if (os === "mac") setOs("Mac");
      else if (os === "linux") setOs("Linux");

      if (ua.includes("arm") || ua.includes("aarch64")) arch = "arm64";

      let ext = "exe";
      if (os === "mac") ext = "dmg";
      else if (os === "linux") ext = "AppImage";

      return { os, arch, ext };
    };

    const fetchLatestVersion = async () => {
      try {
        const response = await fetch(
          "https://api.github.com/repos/mahirox36/Mihari/releases/latest",
        );
        const data = await response.json();
        const { os, arch, ext } = detectPlatform();
        const version = data.tag_name;
        const file_version = version.replace("v", "");
        const filename = `Mihari-Setup-${file_version}-${os}-${arch}.${ext}`;
        const url = `https://github.com/mahirox36/Mihari/releases/download/${version}/${filename}`;
        if (os === "win") setDownloadUrl(url);
      } catch (error) {
        console.error("Failed to get latest release:", error);
      }
    };

    fetchLatestVersion();
  }, []);

  const available = os === "Windows";

  return (
    <a href={downloadUrl || "#"} download={available}>
      <button
        className={`group relative overflow-hidden px-8 py-4 rounded-2xl font-semibold transition-all duration-300 flex items-center gap-2 shadow-lg
          ${
            available
              ? "bg-linear-to-r from-indigo-500 to-teal-400 hover:from-indigo-600 hover:to-teal-500 text-white hover:scale-105 hover:shadow-xl cursor-pointer"
              : "bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed opacity-60"
          }`}
      >
        <Download className="w-5 h-5" />
        <span>
          Download for {os}
          {available ? " (BETA)" : " — Coming Soon"}
        </span>
        {available && (
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        )}
      </button>
    </a>
  );
}

export function DarkModeToggle({
  dark,
  action,
}: {
  dark: boolean;
  action: () => void;
}) {
  return (
    <button
      onClick={action}
      aria-label="Toggle dark mode"
      className="p-2 rounded-xl transition-all duration-300 hover:scale-105
        text-white/80 hover:text-white hover:bg-white/10
        dark:text-gray-300 dark:hover:text-white dark:hover:bg-white/10
        data-scrolled:text-gray-600 data-scrolled:hover:bg-gray-100"
    >
      {dark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
    </button>
  );
}

// ─── Hero Section ─────────────────────────────────────────────────────────────

export const HeroSection = ({
  subtitle,
  description,
  secondaryCTA,
  stats,
}: {
  subtitle: string;
  description: string;
  secondaryCTA: string;
  stats: Array<{ value: string; label: string }>;
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(t);
  }, []);

  return (
    <section
      className="relative min-h-screen pt-16 flex items-center justify-center overflow-hidden
      bg-linear-to-br from-blue-50 via-teal-50 to-indigo-100
      dark:from-gray-950 dark:via-slate-900 dark:to-indigo-950"
    >
      {/* Background blobs */}
      <div
        className="absolute inset-0 overflow-hidden pointer-events-none"
        aria-hidden="true"
      >
        <div
          className="absolute top-[-40%] right-[-40%] w-240 h-240
          bg-linear-to-br from-indigo-400/20 to-teal-600/20
          dark:from-indigo-600/30 dark:to-teal-800/30
          rounded-full blur-[120px] animate-pulse"
        />
        <div
          className="absolute bottom-[-40%] left-[-40%] w-240 h-240
          bg-linear-to-tr from-cyan-400/20 to-blue-600/20
          dark:from-cyan-700/25 dark:to-blue-900/25
          rounded-full blur-[120px] animate-pulse"
          style={{ animationDelay: "2s" }}
        />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 text-center flex flex-col items-center">
        <div
          className={`transition-all duration-1000 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
        >
          {/* App icon */}
          <div className="mb-8 relative group flex justify-center mt-8">
            <div className="absolute w-60 h-60 rounded-4xl bg-linear-to-r from-indigo-500 to-teal-600 opacity-25 dark:opacity-40 blur-2xl group-hover:opacity-40 transition duration-500" />
            <img
              src="icon.svg"
              alt="Mihari App Icon"
              className="relative w-48 h-48 rounded-4xl p-6 shadow-2xl hover:scale-105 transition-transform duration-500"
            />
          </div>

          {/* Logo */}
          <h1 className="mb-6 flex justify-center">
            <img
              src="icon2-black.png"
              alt="Mihari"
              className="w-[20rem] max-w-full hover:scale-105 transition-transform duration-500 drop-shadow-lg dark:hidden"
            />
            <img
              src="icon2.png"
              alt="Mihari"
              className="w-[20rem] max-w-full hover:scale-105 transition-transform duration-500 drop-shadow-lg hidden dark:block"
            />
          </h1>

          <p className="text-2xl md:text-3xl text-gray-800 dark:text-gray-100 mb-4 font-bold tracking-tight">
            {subtitle}
          </p>
          <p className="text-lg md:text-xl text-gray-600 dark:text-gray-400 mb-8 max-w-3xl mx-auto leading-relaxed">
            {description}
          </p>

          {/* Stats */}
          {stats && (
            <div className="flex flex-wrap justify-center gap-8 mb-12">
              {stats.map((stat, i) => (
                <div key={i} className="text-center">
                  <div className="text-4xl font-extrabold text-gray-900 dark:text-white">
                    {stat.value}
                  </div>
                  <div className="text-gray-500 dark:text-gray-400">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <DownloadButton />
            {secondaryCTA && (
              <a
                href="https://github.com/mahirox36/Mihari/"
                target="_blank"
                rel="noopener noreferrer"
              >
                <button className="group cursor-pointer bg-white/90 dark:bg-white/10 backdrop-blur-sm hover:bg-white dark:hover:bg-white/20 text-gray-700 dark:text-gray-200 px-8 py-4 rounded-2xl font-semibold transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-2xl flex items-center gap-2 border border-gray-200 dark:border-white/10">
                  <Play className="w-5 h-5" />
                  <span>{secondaryCTA}</span>
                </button>
              </a>
            )}
          </div>

          <div className="flex justify-center text-sm text-gray-400 dark:text-gray-500">
            Windows only · Mac & Linux coming soon
          </div>

          {/* Scroll indicator */}
          <div className="mt-16 flex justify-center animate-bounce">
            <ChevronDown className="w-6 h-6 text-gray-400 dark:text-gray-600" />
          </div>
        </div>
      </div>
    </section>
  );
};

// ─── Feature Card ─────────────────────────────────────────────────────────────

export const FeatureCard = ({
  icon: Icon,
  title,
  description,
  color,
  isActive,
  action,
}: {
  icon: any;
  title: string;
  description: string;
  color: string;
  isActive: boolean;
  action: () => void;
}) => (
  <div
    className={`p-8 rounded-2xl border-2 transition-all duration-500 cursor-pointer
      ${
        isActive
          ? "border-indigo-500 bg-linear-to-br from-indigo-50 to-teal-50 dark:from-indigo-950/60 dark:to-teal-950/60 scale-105 shadow-xl dark:border-indigo-400"
          : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-lg bg-white dark:bg-gray-900"
      }`}
    onClick={action}
  >
    <div
      className={`w-12 h-12 rounded-xl bg-linear-to-r ${color} flex items-center justify-center mb-6`}
    >
      <Icon className="w-6 h-6 text-white" />
    </div>
    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
      {title}
    </h3>
    <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-sm">
      {description}
    </p>
  </div>
);

// ─── Testimonial Card ─────────────────────────────────────────────────────────

export const TestimonialCard = ({
  name,
  rating,
  text,
  avatar,
  platform,
}: {
  name: string;
  rating: number;
  text: string;
  avatar: ReactNode;
  platform: string;
}) => (
  <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-6 rounded-2xl hover:shadow-lg transition-shadow duration-300 min-w-87.5 max-w-87.5 shrink-0 shadow-sm">
    <div className="flex items-center mb-4">
      <div className="w-12 h-12 bg-linear-to-r from-indigo-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold mr-4 overflow-hidden shadow-lg shrink-0">
        {avatar}
      </div>
      <div>
        <div className="font-semibold text-gray-900 dark:text-white">
          {name}
        </div>
        <div className="flex items-center gap-2">
          {[...Array(rating)].map((_, i) => (
            <Star
              key={i}
              className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400"
            />
          ))}
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {platform}
          </span>
        </div>
      </div>
    </div>
    <p className="text-gray-600 dark:text-gray-400 italic text-sm leading-relaxed">
      "{text}"
    </p>
  </div>
);

// ─── README Section ────────────────────────────────────────────────────────────

const ReadmeSection = () => {
  const [open, setOpen] = useState<number | null>(null);

  const items = [
    {
      title: "What is Mihari?",
      content:
        "Mihari is a sleek, fast, and highly customizable media downloader built on top of AsyncYT. It lets you download videos and audio from thousands of platforms including YouTube, TikTok, Instagram, X, and many more — all through a cute and intuitive interface.",
    },
    {
      title: "Requirements",
      content:
        "Windows 10 or later. The installer bundles everything you need — no manual Python or ffmpeg setup required. Just download, install, and you're ready to go.",
    },
    {
      title: "How do I report a bug?",
      content:
        "Head over to the GitHub Issues page at github.com/mahirox36/Mihari/issues and open a new issue. Please include your OS version, the URL you were trying to download, and what went wrong. Screenshots are always helpful!",
    },
    {
      title: "Is Mihari free?",
      content:
        "Yes! Mihari is completely free and open-source under the GPLv3 license. No ads, no subscriptions, no paywalls. Ever.",
    },
    {
      title: "When is Mac / Linux support coming?",
      content:
        "Mac and Linux support is planned for the full release. The Windows beta is stable enough to use daily — follow the GitHub repo for release announcements.",
    },
    {
      title: "What formats and quality options are supported?",
      content:
        "Mihari supports MP4, MKV, WebM, MP3, FLAC, WAV, and more. You can choose resolution (up to 8K where available), audio bitrate, whether to embed subtitles and thumbnails, and even save your preferred settings as presets.",
    },
  ];

  return (
    <section className="py-20 bg-white dark:bg-gray-950" id="readme">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-medium text-sm mb-3 tracking-wide uppercase">
            <BookOpen className="w-4 h-4" />
            Documentation
          </div>
          <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Frequently Asked
          </h2>
          <p className="text-gray-500 dark:text-gray-400">
            Everything you need to get started with Mihari.
          </p>
        </div>

        <div className="space-y-3">
          {items.map((item, i) => (
            <div
              key={i}
              className="rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden bg-gray-50 dark:bg-gray-900 transition-all duration-200"
            >
              <button
                className="w-full px-6 py-4 text-left flex items-center justify-between gap-4 group"
                onClick={() => setOpen(open === i ? null : i)}
              >
                <span className="font-semibold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  {item.title}
                </span>
                <ChevronDown
                  className={`w-4 h-4 text-gray-400 shrink-0 transition-transform duration-300 ${open === i ? "rotate-180 text-indigo-500" : ""}`}
                />
              </button>
              <div
                className={`transition-all duration-300 overflow-hidden ${open === i ? "max-h-64" : "max-h-0"}`}
              >
                <p className="px-6 pb-5 text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                  {item.content}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 text-center">
          <a
            href="https://github.com/mahirox36/Mihari/blob/main/README.md"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-medium text-sm transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Read full README on GitHub
          </a>
        </div>
      </div>
    </section>
  );
};

// ─── Main Landing Page ────────────────────────────────────────────────────────

export default function MihariLandingPage() {
  const [activeFeature, setActiveFeature] = useState(0);
  const { dark } = useDarkMode();

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveFeature((prev) => (prev + 1) % 9);
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
      icon: Bell,
      title: "System Tray Actions",
      description:
        "Access key actions right from your system tray — open downloads folder or instantly paste & download.",
      color: "from-indigo-600 to-blue-500",
    },
    {
      icon: Save,
      title: "Presets",
      description:
        "Save, load, export, and import your favorite download settings in a single click.",
      color: "from-teal-300 to-cyan-500",
    },
    {
      icon: Keyboard,
      title: "Keyboard Shortcuts",
      description:
        "Navigate Mihari lightning-fast with keyboard shortcuts for download, save, load, audio-only mode, and more.",
      color: "from-orange-500 to-red-500",
    },
    {
      icon: ListVideo, // or ListVideo, depending on your icon library
      title: "Playlist Support",
      description:
        "Download full playlists in one go. Select specific videos, customize settings for the whole set, and save time.",
      color: "from-blue-600 to-indigo-900", // Suggesting a "playlist" blue/indigo gradient
    },
  ];

  const testimonials = [
    {
      name: "Hans",
      rating: 5,
      text: "This app is peak! I always used to struggle with downloading videos from well-known sites, but with Mihari I don't struggle anymore. With just three simple clicks, I can download playlists in any codec I like—and in the best quality too. It's a total game changer!",
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
      text: "The app is excellent, there are no ads, and it doesn't force you to download lower quality like other apps or websites. My honest rating for the app is 10/10, and I highly recommend it!",
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
      rating: 4,
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
          src="anas.jpg"
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
      platform: "Miku Hater",
    },
  ];

  const stats = [
    { value: "100+", label: "Downloads" },
    { value: "4.8★", label: "Rating" },
    { value: "Beta", label: "Status" },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 transition-colors duration-300">
      {/* Hero */}
      <HeroSection
        subtitle="Your Adorable Video & Audio Downloader 💖"
        description="Sleek, fast, and super customizable media downloader powered by yt-dlp. Download from anywhere with cute vibes and powerful features! ✨"
        secondaryCTA="View on GitHub"
        stats={stats}
      />

      {/* Features */}
      <section className="py-20 bg-white dark:bg-gray-950" id="about">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              ✨ Why Choose Mihari?
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Power and personality combined. Download anything from anywhere
              with style! 🌟
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <FeatureCard
                key={index}
                icon={feature.icon}
                title={feature.title}
                description={feature.description}
                color={feature.color}
                isActive={activeFeature === index}
                action={() => setActiveFeature(index)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Demo / App Screenshot */}
      <section className="py-20 bg-linear-to-br from-gray-50 to-indigo-50 dark:from-gray-900 dark:to-indigo-950">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              🎬 See Mihari in Action
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400">
              Beautiful interface meets powerful functionality
            </p>
          </div>

          <div className="relative max-w-5xl mx-auto">
            <div className="overflow-hidden rounded-2xl shadow-2xl ring-1 ring-black/10 dark:ring-white/10">
              {/* Light mode screenshot */}
              <img
                src="app.png"
                alt="Mihari App — Light Mode"
                className="block w-full h-auto dark:hidden"
                loading="lazy"
              />
              {/* Dark mode screenshot — falls back to same image if dark version doesn't exist */}
              <img
                src="app-dark.png"
                alt="Mihari App — Dark Mode"
                className="hidden w-full h-auto dark:block"
                loading="lazy"
                onError={(e) => {
                  // fallback to light screenshot if dark version isn't available yet
                  (e.target as HTMLImageElement).src = "app.png";
                }}
              />
            </div>

            <div className="grid md:grid-cols-2 gap-6 mt-8">
              <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-md border border-gray-100 dark:border-gray-800">
                <div className="flex items-center mb-3">
                  <div className="w-8 h-8 bg-linear-to-r from-green-500 to-teal-500 rounded-lg flex items-center justify-center mr-3">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="font-bold text-gray-900 dark:text-white">
                    One-Click Downloads
                  </h3>
                </div>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Paste your link and hit download. That's it! Mihari handles
                  the rest.
                </p>
              </div>

              <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-md border border-gray-100 dark:border-gray-800">
                <div className="flex items-center mb-3">
                  <div className="w-8 h-8 bg-linear-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center mr-3">
                    <Heart className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="font-bold text-gray-900 dark:text-white">
                    Cute & Powerful
                  </h3>
                </div>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Adorable interface with enterprise-grade performance. Best of
                  both worlds!
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-white dark:bg-gray-950">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              💖 What Beta Testers Say
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400">
              Real feedback from real users who tested Mihari
            </p>
          </div>

          <div className="relative overflow-hidden group">
            <div
              className="flex gap-6 animate-marquee group-hover:paused"
              style={{ width: `${testimonials.length * 2 * 368}px` }}
            >
              {testimonials.concat(testimonials).map((t, i) => (
                <TestimonialCard key={i} {...t} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* README / FAQ */}
      <ReadmeSection />

      {/* Download CTA */}
      <section className="py-20 bg-linear-to-r from-indigo-600 via-blue-500 to-teal-400 dark:from-indigo-800 dark:via-blue-700 dark:to-teal-600">
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
              className="bg-white text-cyan-600 px-8 py-4 rounded-2xl font-semibold hover:bg-gray-50 transition-all duration-300 hover:scale-105 shadow-lg flex items-center justify-center gap-2"
            >
              <Download className="w-5 h-5" />
              <span>Download Mihari-Setup.exe</span>
            </a>

            <a
              href="https://github.com/mahirox36/Mihari"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white/10 backdrop-blur-sm text-white px-8 py-4 rounded-2xl font-semibold hover:bg-white/20 transition-all duration-300 hover:scale-105 shadow-lg border border-white/20 flex items-center justify-center gap-2"
            >
              <ExternalLink className="w-5 h-5" />
              <span>View on GitHub</span>
            </a>
          </div>

          <p className="text-blue-100 text-sm mt-6">
            Windows only · Mac & Linux coming in final release · GPLv3 License
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 dark:bg-black text-white py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="text-2xl font-bold mb-4">🌸 Mihari</div>
              <p className="text-gray-400 text-sm">
                Your adorable video & audio downloader with personality and
                power! 💖
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-4 text-gray-200">Downloads</h4>
              <ul className="space-y-2 text-sm text-gray-400">
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
              <h4 className="font-semibold mb-4 text-gray-200">Development</h4>
              <ul className="space-y-2 text-sm text-gray-400">
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
              <h4 className="font-semibold mb-4 text-gray-200">Support</h4>
              <ul className="space-y-2 text-sm text-gray-400">
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
                    href="https://discord.gg/a85rPNbGhn"
                    className="hover:text-white transition-colors"
                  >
                    Discord Server
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-indigo-400 text-sm">
            <a
              href="https://github.com/mahirox36/Mihari?tab=readme-ov-file#-licenses-for-mihari-components"
              className="hover:text-indigo-300 transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              &copy; 2025 Mihari. Licensed under GPLv3 License.
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
