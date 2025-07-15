export {};

declare global {
  interface Window {
    api: {
      minimize: () => void;
      maximize: () => void;
      close: () => void;
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
      on: (channel: string, callback: (...args: any[]) => void) => void;
      removeListener: (
        channel: string,
        callback: (...args: any[]) => void
      ) => void;
      invoke: (channel: string, ...args: any[]) => Promise<any>;
      notify: (title: string, body: string, filePath: string, buttons: boolean) => boolean;
      openExternal: (url: string) => null;
      getVersion: () => string;
      pythonProcessStatus: () => {
        running: boolean;
        ready: boolean;
      };
      // openPotatoWindow: () => null;
    };
  }
}
