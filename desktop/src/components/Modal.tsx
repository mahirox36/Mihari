import React from "react";
import { useSettings } from "../hooks/SettingsContext";
import { X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  modalType?: string;
  /** When provided, renders left of the X button instead of the default empty space */
  customHeader?: React.ReactNode;
  /** Controls modal width. Defaults to "md" (max-w-lg). Use "xl" for playlist etc. */
  size?: "md" | "lg" | "xl";
}

const SIZE_CLASS: Record<string, string> = {
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-2xl",
};

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  children,
  customHeader,
  modalType,
  size = "md",
}) => {
  const { performanceMode } = useSettings();

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-40 flex items-center justify-center p-4"
          onClick={onClose}
          key={modalType}
        >
          {/* Backdrop */}
          <motion.div
            className={`fixed inset-0 bg-linear-to-br from-black/40 via-gray-900/50 to-black/60 ${
              performanceMode ? "" : "backdrop-blur-md"
            }`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          />

          {/* Modal container — flex column, never taller than 90vh */}
          <motion.div
            className={`relative w-full ${SIZE_CLASS[size]} flex flex-col bg-linear-to-br from-white via-gray-50 to-white dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 rounded-2xl shadow-2xl mt-6 -mb-3 overflow-hidden`}
            style={{ maxHeight: "90vh" }}
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.8, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 50 }}
            transition={{
              duration: 0.4,
              ease: [0.16, 1, 0.3, 1],
              type: "spring",
              damping: 25,
              stiffness: 300,
            }}
          >
            {/*
              ── HEADER ROW ──
              Always a fixed-height row: [customHeader flex-1] [X button shrink-0]
              No absolute positioning — both live in the same flex row so they
              can never overlap.
            */}
            <div className="flex items-start gap-3 px-5 pt-4 pb-0 shrink-0">
              {/* Left slot: custom header or empty spacer */}
              <div className="flex-1 min-w-0">
                {customHeader ?? null}
              </div>

              {/* Close button — always right-aligned, never overlaps content */}
              <button
                className="group shrink-0 cursor-pointer relative p-2 rounded-full transition-all duration-200 ease-out hover:bg-red-50 dark:hover:bg-red-900/20 focus:outline-none focus:ring-2 focus:ring-red-400 dark:focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
                onClick={onClose}
                aria-label="Close modal"
              >
                <X className="w-5 h-5 text-gray-500 dark:text-gray-400 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors duration-200" />
                <div className="absolute inset-0 rounded-full bg-red-500/10 scale-0 group-hover:scale-100 transition-transform duration-200 ease-out" />
              </button>
            </div>

            {/*
              ── CONTENT AREA ──
              flex-1 + min-h-0 lets this region expand to fill the modal and
              scroll internally. The children are responsible for their own
              overflow — do NOT add overflow-y-auto here; let the child do it
              on the specific scrollable sub-region (e.g. the video list).
            */}
            <div className="flex-1 min-h-0 px-5 pb-5 flex flex-col">
              {children}
            </div>

            {/* Decorative glow — pointer-events-none so it never blocks clicks */}
            <div className="absolute inset-0 rounded-2xl bg-linear-to-br from-teal-500/5 via-transparent to-blue-500/5 pointer-events-none" />
            <div className="absolute inset-0 rounded-2xl border border-white/10 dark:border-white/5 pointer-events-none" />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Modal;