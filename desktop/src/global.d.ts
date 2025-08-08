export {};

declare global {
  interface Window {
    api: {
      minimize: () => void;
      maximize: () => void;
      close: (closeToTray: boolean) => void;
      selectOutputPath: () => {
        success: boolean;
        cancelled?: boolean;
        error?: string;
        path?: string;
      };
      selectCookieFile: () => {
        success: boolean;
        cancelled?: boolean;
        error?: string;
        path?: string;
      };
      selectMihariPresetFile: () => {
        success: boolean;
        cancelled?: boolean;
        error?: string;
        paths?: string[];
      };
      saveMihariPresetFile: (name: string) => {
        success: boolean;
        cancelled?: boolean;
        error?: string;
        path?: string;
      };
      showInFolder: (filePath: string) => {
        success: boolean;
        filePath?: string;
        error?: any;
      };
      openFile: (filePath: string) => {
        success: boolean;
        error?: any;
      };
      getPaste: () => {
        success: boolean;
        text?: string;
        error?: any;
      };
      onBackendReady: (callback: () => void) => void;
      onDownloadRequest: (callback: () => void) => void;
      on: (channel: string, callback: (...args: any[]) => void) => void;
      send: (channel: string, data?: any) => void;
      removeListener: (
        channel: string,
        callback: (...args: any[]) => void
      ) => void;
      invoke: (channel: string, ...args: any[]) => Promise<any>;
      notify: (title: string, body: string, filePath: string, buttons: boolean) => boolean;
      openExternal: (url: string) => null;
      getVersion: () => string;
      handleFile: (file: string | null) => Record<string, any>;
      pythonProcessStatus: () => {
        running: boolean;
        ready: boolean;
      };
      isUpdateAvailable: () => {
        updateAvailable: boolean;
        localVersion: string;
        latestVersion: string;
      }
      onOpenFile: (callback: (filePath) => void) => void;
      // openPotatoWindow: () => null;
    };
  }
}
