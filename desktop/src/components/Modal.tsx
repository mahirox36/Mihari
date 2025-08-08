import React from "react";
import { useSettings } from "../hooks/SettingsContext";
import { X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  modalType?: string;
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  children,
  modalType,
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
          {/* Enhanced backdrop */}
          <motion.div
            className={`fixed inset-0 bg-gradient-to-br from-black/40 via-gray-900/50 to-black/60 ${
              performanceMode ? "" : "backdrop-blur-md"
            }`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          />

          {/* Modal container */}
          <motion.div
            className="relative w-full max-w-lg max-h-[90vh] bg-gradient-to-br from-white via-gray-50 to-white dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 rounded-2xl shadow-2xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden"
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
            {/* Header with close button */}
            <div className="flex items-center justify-end p-4 pb-0">
              <button
                className="group cursor-pointer relative p-2 rounded-full transition-all duration-200 ease-out hover:bg-red-50 dark:hover:bg-red-900/20 focus:outline-none focus:ring-2 focus:ring-red-400 dark:focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
                onClick={onClose}
                aria-label="Close modal"
              >
                <X className="w-5 h-5 text-gray-500 dark:text-gray-400 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors duration-200" />

                {/* Hover effect */}
                <div className="absolute inset-0 rounded-full bg-red-500/10 scale-0 group-hover:scale-100 transition-transform duration-200 ease-out" />
              </button>
            </div>

            {/* Scrollable content area */}
            <div className="px-6 pb-6 max-h-[calc(90vh-4rem)] overflow-y-auto custom-scrollbar">
              <div className="space-y-4">{children}</div>
            </div>

            {/* Subtle glow effect */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-teal-500/5 via-transparent to-blue-500/5 pointer-events-none" />

            {/* Border glow */}
            <div className="absolute inset-0 rounded-2xl border border-gradient-to-r from-teal-200/20 via-blue-200/20 to-indigo-200/20 dark:from-cyan-500/20 dark:via-blue-500/20 dark:to-indigo-500/20 pointer-events-none" />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Modal;
