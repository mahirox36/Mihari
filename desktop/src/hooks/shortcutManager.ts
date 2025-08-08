import { useEffect } from "react";

type Shortcut = {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  action: () => void;
};

export function useHotkeys(shortcuts: Shortcut[]) {
  useEffect(() => {
    const isTyping = () => {
      const tag = document.activeElement?.tagName.toLowerCase();
      return (
        tag === "input" ||
        tag === "textarea" ||
        (document.activeElement as HTMLElement | null)?.contentEditable === "true"
      );
    };
    const onKeyDown = (e: KeyboardEvent) => {
      for (const shortcut of shortcuts) {
        if (
          e.key.toLowerCase() === shortcut.key.toLowerCase() &&
          !!shortcut.ctrl === e.ctrlKey &&
          !!shortcut.shift === e.shiftKey &&
          !isTyping()
        ) {
          e.preventDefault();
          shortcut.action();
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [shortcuts]);
}
