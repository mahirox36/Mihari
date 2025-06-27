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
      showInFolder: (filePath: string) => void;
      openFile: (filePath: string) => {
        success: boolean;
        error?: any;
      };
      getPaste: () => {
        success: boolean;
        text?: string;
        error?: any;
      };
    };
  }
}
