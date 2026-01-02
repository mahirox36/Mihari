/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import {
  HealthStatus,
  SetupProgress,
  StartupResponse,
} from "./types/asyncyt.ts";
import { api } from "./api.ts";
import { Toolbar } from "./components/Toolbar.tsx";
import { SettingsProvider } from "./hooks/SettingsContext.tsx";

const isDev = import.meta.env.DEV;

type AppState = {
  loading: boolean;
  error: string | null;
  setupProgress: SetupProgress | null;
  message: string;
};

function LoadingScreen({ state }: { state: AppState }) {
  const [dots, setDots] = useState("");

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? "" : prev + "."));
    }, 500);
    return () => clearInterval(interval);
  }, []);

  const getIcon = () => {
    if (state.error) return "⚠️";
    if (state.setupProgress) return "📦";
    return "🌀";
  };

  return (
    <div className="flex h-screen flex-col">
      <Toolbar closeToTray={false} />
      <div className="h-screen flex items-center justify-center bg-gradient-to-tr from-cyan-100 via-blue-200 to-indigo-200 dark:from-cyan-950 dark:via-blue-950 dark:to-indigo-950">
        <div className="text-center p-8 max-w-md mx-4">
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-2xl p-8 border border-white/20 dark:border-gray-700/30">
            <div className="text-6xl mb-4 animate-pulse">{getIcon()}</div>

            <h1 className="text-2xl font-bold text-gray-800 dark:text-cyan-50 mb-2">
              Mihari Video Downloader
            </h1>

            <p className="text-lg text-gray-600 dark:text-cyan-100 mb-4">
              {state.message}
              {dots}
            </p>

            {state.setupProgress && (
              <div className="mb-4">
                <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                  {state.setupProgress.file === "yt-dlp"
                    ? "Installing yt-dlp"
                    : "Installing FFmpeg"}
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 mb-2">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-600 rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.round(
                        state.setupProgress.download_file_progress.percentage
                      )}%`,
                    }}
                  />
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {state.setupProgress.download_file_progress.status} -{" "}
                  {state.setupProgress.download_file_progress.percentage.toFixed(
                    1
                  )}
                  %
                </div>
              </div>
            )}

            {state.error && (
              <div className="bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg mb-4 text-sm">
                <p className="font-medium mb-1">Error</p>
                <p>{state.error}</p>
              </div>
            )}

            {!state.setupProgress && (
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-6">
                <div className="h-full bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-600 rounded-full animate-pulse" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Root() {
  const [state, setState] = useState<AppState>({
    loading: !isDev, // Skip loading in dev mode
    error: null,
    setupProgress: null,
    message: "Checking backend status",
  });
  const [theme, setTheme] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.theme || "system";
    }
    return "system";
  });

  useEffect(() => {
    const root = document.documentElement;

    if (theme === "dark") {
      root.classList.add("dark");
      localStorage.theme = "dark";
    } else if (theme === "light") {
      root.classList.remove("dark");
      localStorage.theme = "light";
    } else {
      // System preference
      localStorage.removeItem("theme");
      const prefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)"
      ).matches;
      root.classList.toggle("dark", prefersDark);
    }
  }, [theme]);

  useEffect(() => {
    if (theme === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handleChange = (e: any) => {
        document.documentElement.classList.toggle("dark", e.matches);
      };

      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }
  }, [theme]);

  const checkHealth = async (): Promise<HealthStatus | null> => {
    try {
      const response = await api.get<HealthStatus>("/health");
      return response.data;
    } catch (error) {
      console.error("Health check failed:", error);
      return null;
    }
  };

  const startSetup = async () => {
    try {
      setState((prev) => ({
        ...prev,
        message: "Installing missing libraries",
      }));

      const ws = new WebSocket("ws://localhost:8153/api/v1/ws/startup");

      ws.onmessage = (event) => {
        const response: StartupResponse = JSON.parse(event.data);

        if (response.type === "progress" && response.data) {
          setState((prev) => ({
            ...prev,
            setupProgress: response.data!,
            message: "Installing dependencies",
          }));
        } else if (response.type === "complete") {
          setState((prev) => ({
            ...prev,
            setupProgress: null,
            message: "Setup complete, checking health",
          }));
          ws.close();
          // Recheck health after setup
          setTimeout(initializeApp, 1000);
        } else if (response.type === "error") {
          setState((prev) => ({
            ...prev,
            error: response.error || "Setup failed",
            loading: false,
          }));
          ws.close();
        } else if (response.type === "ping") {
          ws.send("pong");
        }
      };

      ws.onerror = () => {
        setState((prev) => ({
          ...prev,
          error: "WebSocket connection failed",
          loading: false,
        }));
      };
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: `Setup failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        loading: false,
      }));
    }
  };

  const initializeApp = async () => {
    const health = await checkHealth();

    if (!health) {
      setState((prev) => ({
        ...prev,
        error:
          "Cannot connect to backend. Make sure the server is running on localhost:8153",
        loading: false,
      }));
      return;
    }

    if (health.error) {
      setState((prev) => ({
        ...prev,
        error: health.error!,
        loading: false,
      }));
      return;
    }

    // Check if libraries are available
    if (!health.yt_dlp_available || !health.ffmpeg_available) {
      await startSetup();
    } else {
      // Everything is ready
      setState((prev) => ({
        ...prev,
        loading: false,
        error: null,
      }));
    }
  };


  window.api.onBackendReady(async () => {
    if (isDev) {
      console.log("Development mode: skipping backend ready call");
      return;
    }
    initializeApp();
  });

  if (state.loading) {
    return <LoadingScreen state={state} />;
  }

  if (state.error) {
    return <LoadingScreen state={state} />;
  }

  return <App theme={theme} setTheme={setTheme} />;
}

// Simple Error Boundary
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-tr from-cyan-100 via-blue-200 to-indigo-200 dark:from-cyan-950 dark:via-blue-950 dark:to-indigo-950">
          <div className="text-center p-8 max-w-md mx-4">
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-2xl p-8 border border-white/20 dark:border-gray-700/30">
              <div className="text-6xl mb-4">💥</div>
              <h1 className="text-2xl font-bold text-gray-800 dark:text-cyan-50 mb-2">
                Something went wrong
              </h1>
              <button
                onClick={() => window.location.reload()}
                className="bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-600 hover:from-cyan-600 hover:via-blue-600 hover:to-indigo-700 text-white font-medium px-6 py-3 rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
              >
                Reload
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <SettingsProvider>
      <ErrorBoundary>
        <Root />
      </ErrorBoundary>
    </SettingsProvider>
  </React.StrictMode>
);
