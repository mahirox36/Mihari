import React from "react";
import { useSettings } from "../hooks/SettingsContext";
import { X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children }) => {
  const { performanceMode } = useSettings();

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className={`fixed inset-0 z-40 flex items-center justify-center `}
          onClick={onClose}
        >
          <motion.div
            className={`fixed inset-0 flex items-center justify-center bg-black/50 ${
              performanceMode ? "" : "backdrop-blur-sm"
            }`}
            initial={{opacity:0}}
            animate={{opacity:1}}
            exit={{opacity:0}}
          />
          <motion.div
            className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-xl relative w-[90%] max-w-md"
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
          >
            <button
              className="absolute top-2 right-2 flex items-center justify-center transition-all duration-150 ease-in-out focus:outline-none rounded hover:text-white hover:bg-red-500"
              onClick={onClose}
            >
              <X />
            </button>

            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default Modal;
