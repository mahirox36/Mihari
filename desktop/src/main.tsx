import React, { useEffect, useState, useCallback, useRef } from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const isDev = import.meta.env.DEV;

interface BackendStatus {
  ready: boolean;
  error: string | null;
  retryCount: number;
  lastCheck: number;
}

interface LoadingProps {
  status: BackendStatus;
}

function Loading({ status }: LoadingProps) {
  const [dots, setDots] = useState("");

  // Animate loading dots
  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? "" : prev + "."));
    }, 500);
    return () => clearInterval(interval);
  }, []);

  const getStatusMessage = () => {
    if (status.error) {
      return "Backend connection failed";
    }
    if (status.retryCount > 0) {
      return `Reconnecting (attempt ${status.retryCount})`;
    }
    return "Starting backend";
  };

  const getStatusIcon = () => {
    if (status.error) return "⚠️";
    if (status.retryCount > 0) return "🔄";
    return "🌀";
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-tr from-cyan-100 via-blue-200 to-indigo-200 dark:from-cyan-950 dark:via-blue-950 dark:to-indigo-950">
      <div className="text-center p-8 max-w-md mx-4">
        {/* Loading Card */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-2xl p-8 border border-white/20 dark:border-gray-700/30">
          {/* Icon */}
          <div className={`text-6xl mb-4 ${getStatusIcon() === "⚠️" ? "animate-pulse" : "animate-spin"}`}>{getStatusIcon()}</div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-gray-800 dark:text-cyan-50 mb-2">
            Mihari Video Downloader
          </h1>

          {/* Status */}
          <p className="text-lg text-gray-600 dark:text-cyan-100 mb-4">
            {getStatusMessage()}
            {dots}
          </p>

          {/* Progress Bar */}
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-6 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-600 rounded-full animate-pulse"></div>
          </div>

          {/* Error Message */}
          {status.error && (
            <div className="bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg mb-4 text-sm">
              <p className="font-medium mb-1">Connection Error</p>
              <p className="opacity-90">{status.error}</p>
            </div>
          )}

          {/* Help Text */}
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
            {status.retryCount > 0
              ? "Checking if backend is ready..."
              : "Backend may still be starting up from previous session"}
          </p>
        </div>
      </div>
    </div>
  );
}

function Root() {
  const [backendStatus, setBackendStatus] = useState<BackendStatus>({
    ready: isDev,
    error: null,
    retryCount: 0,
    lastCheck: Date.now(),
  });

  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isCheckingRef = useRef(false);

  // Check backend status
  const checkBackendStatus = useCallback(async () => {
    if (isDev || isCheckingRef.current) return;

    isCheckingRef.current = true;

    try {
      const status = await window.api.invoke("python-process-status");
      const now = Date.now();

      setBackendStatus((prev) => ({
        ...prev,
        ready: status.ready,
        error: status.running
          ? status.ready
            ? null
            : prev.error
          : "Backend process not running",
        lastCheck: now,
      }));

      if (status.ready) {
        // Backend is ready, stop checking
        if (checkIntervalRef.current) {
          clearInterval(checkIntervalRef.current);
          checkIntervalRef.current = null;
        }
      }
    } catch (error) {
      console.error("Failed to check backend status:", error);
      setBackendStatus((prev) => ({
        ...prev,
        error: `Connection failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        lastCheck: Date.now(),
      }));
    } finally {
      isCheckingRef.current = false;
    }
  }, []);

  // Start periodic status checking (without restarting)
  const startStatusChecking = useCallback(() => {
    if (isDev || checkIntervalRef.current) return;

    console.log("Starting backend status monitoring...");

    // Initial check
    checkBackendStatus();

    // Set up periodic checking
    checkIntervalRef.current = setInterval(checkBackendStatus, 2000);

    // Set timeout for maximum wait time
    timeoutRef.current = setTimeout(() => {
      if (!backendStatus.ready) {
        setBackendStatus((prev) => ({
          ...prev,
          error:
            "Backend is taking longer than expected - it may still be starting up",
        }));
      }
    }, 30000); // 30 second timeout
  }, [checkBackendStatus, backendStatus.ready]);

  // Handle backend ready event
  useEffect(() => {
    if (isDev) return;

    const handleBackendReady = () => {
      console.log("Backend ready event received");
      setBackendStatus((prev) => ({
        ...prev,
        ready: true,
        error: null,
      }));

      // Clear checking interval
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
        checkIntervalRef.current = null;
      }

      // Clear timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };

    const handleBackendError = (data: any) => {
      console.error("Backend error:", data);
      setBackendStatus((prev) => ({
        ...prev,
        ready: false,
        error: data.error || "Backend error occurred",
      }));
    };

    const handleBackendCrash = (data: any) => {
      console.error("Backend crashed:", data);
      setBackendStatus((prev) => ({
        ...prev,
        ready: false,
        error: `Backend crashed (code: ${data.code})`,
      }));
    };

    // Set up event listeners
    window.api.onBackendReady(handleBackendReady);
    window.api.on?.("python-process-error", handleBackendError);
    window.api.on?.("python-process-crashed", handleBackendCrash);

    // Start checking immediately
    startStatusChecking();

    // Cleanup
    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
        checkIntervalRef.current = null;
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      // Remove event listeners if API supports it
      if (window.api.removeListener) {
        window.api.removeListener("backend-ready", handleBackendReady);
        window.api.removeListener("python-process-error", handleBackendError);
        window.api.removeListener("python-process-crashed", handleBackendCrash);
      }
    };
  }, [startStatusChecking]);

  // Handle visibility change (page focus/blur)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && !isDev && !backendStatus.ready) {
        // Page became visible and backend isn't ready - check status
        console.log("Page became visible, checking backend status...");
        checkBackendStatus();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [checkBackendStatus, backendStatus.ready]);

  // Handle online/offline events
  useEffect(() => {
    const handleOnline = () => {
      if (!isDev && !backendStatus.ready) {
        console.log("Connection restored, checking backend...");
        checkBackendStatus();
      }
    };

    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [checkBackendStatus, backendStatus.ready]);

  // Show loading screen if backend isn't ready
  if (!backendStatus.ready) {
    return <Loading status={backendStatus} />;
  }

  return <App />;
}

// Error Boundary Component
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

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("React Error Boundary caught an error:", error, errorInfo);
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
              <p className="text-gray-600 dark:text-cyan-100 mb-4">
                The application encountered an unexpected error.
              </p>
              <button
                onClick={() => window.location.reload()}
                className="bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-600 hover:from-cyan-600 hover:via-blue-600 hover:to-indigo-700 text-white font-medium px-6 py-3 rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
              >
                Reload Application
              </button>
              {this.state.error && (
                <details className="mt-4 text-left">
                  <summary className="cursor-pointer text-sm text-gray-500 dark:text-gray-400">
                    Error Details
                  </summary>
                  <pre className="mt-2 p-2 bg-gray-100 dark:bg-gray-900 rounded text-xs overflow-auto">
                    {this.state.error.message}
                  </pre>
                </details>
              )}
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
    <ErrorBoundary>
      <Root />
    </ErrorBoundary>
  </React.StrictMode>
);
