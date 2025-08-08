import { LucideProps } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";

interface SwitchProbe {
  name: string;
  property: boolean;
  setProperty: React.Dispatch<React.SetStateAction<boolean>>;
  disabled?: boolean;
}

interface ButtonProps {
  name: string;
  description?: string;
  Icon: React.ForwardRefExoticComponent<
    Omit<LucideProps, "ref"> & React.RefAttributes<SVGSVGElement>
  >;
  property: string;
  setProperty: React.Dispatch<React.SetStateAction<string>>;
}

export function Switch({
  name,
  property,
  setProperty,
  disabled = false,
}: SwitchProbe) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex-1 text-sm font-medium text-[var(--switch-text)] dark:text-[var(--dark-switch-text)] select-none">
        {name}
      </span>
      <button
        onClick={() => setProperty(!property)}
        disabled={disabled}
        className={`
      relative w-12 h-6 flex-shrink-0 rounded-full transition-all duration-300 ease-in-out cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--focus-ring)]
      ${
        property
          ? "bg-gradient-to-r from-[var(--switch-on-from)] via-[var(--switch-on-via)] to-[var(--switch-on-to)] shadow-[var(--switch-shadow)]"
          : "bg-[var(--switch-off-bg)] dark:bg-[var(--dark-switch-off-bg)]"
      }
      hover:scale-105 active:scale-95 disabled:bg-gray-300/80 disabled:dark:bg-gray-600/80 disabled:cursor-not-allowed
    `}
      >
        <div
          className={`
        absolute top-0.5 w-5 h-5 bg-[var(--switch-circle-bg)] rounded-full shadow-md
        transition-all duration-300 ease-in-out
        ${property ? "left-6" : "left-0.5"}
      `}
        />
      </button>
    </div>
  );
}

export function Button({ name, Icon, property, setProperty }: ButtonProps) {
  const isActive = name === property;
  return (
    <button
      onClick={() => setProperty(name)}
      className={`
    flex items-center gap-3 p-3 text-lg rounded-lg cursor-pointer shadow-sm
    transition-all duration-150 ease-in-out active:scale-95 select-none focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-300
    ${
      isActive
        ? "bg-white text-indigo-700 font-bold hover:bg-white/80"
        : "bg-white/20 text-white hover:bg-white/40"
    }
  `}
    >
      <Icon />
      {name}
    </button>
  );
}

export function GridedButton({
  name,
  description,
  Icon,
  property,
  setProperty,
}: ButtonProps) {
  const isActive = name === property;
  return (
    <button
      onClick={() => setProperty(name)}
      className={`
    w-50 h-36 flex-initial flex flex-col items-center justify-center gap-3 
    rounded-2xl transition-all duration-300 text-xl font-bold
    shadow-lg hover:shadow-2xl transform hover:scale-105
    border-2 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-300
    ${
      isActive
        ? "bg-gradient-to-br from-indigo-500/90 to-blue-600/90 text-white border-indigo-300/50 shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:from-indigo-400/95 hover:to-blue-500/95 dark:hover:from-indigo-600/95 dark:hover:to-blue-700/95"
        : "bg-gradient-to-br from-white/25 to-slate-100/20 text-slate-700 dark:text-slate-100 border-white/30 hover:bg-gradient-to-br hover:from-indigo-100/80 hover:to-blue-100/60 hover:text-indigo-700 hover:border-indigo-200/50"
    }
  `}
    >
      <Icon className="w-10 h-10" />
      {name}
      <h2 className="text-sm font-medium h-7">{description}</h2>
    </button>
  );
}
interface DropdownItem {
  label: React.ReactNode;
  value?: string;
  onClick?: () => void;
  disabled?: boolean;
  icon?: React.ForwardRefExoticComponent<
    Omit<LucideProps, "ref"> & React.RefAttributes<SVGSVGElement>
  >;
  danger?: boolean;
  divider?: boolean;
}

interface DropdownProps {
  trigger?: React.ReactNode;
  placeholder?: string;
  items: DropdownItem[];
  value?: string;
  onSelect?: (value: string) => void;
  disabled?: boolean;
  variant?: "default" | "button" | "minimal";
  size?: "sm" | "md" | "lg";
  position?: "left" | "right" | "center";
  maxHeight?: string;
  searchable?: boolean;
  closeOnSelect?: boolean;
  className?: string;
  triggerClassName?: string;
  menuClassName?: string;
  itemClassName?: string;
  width?: "auto" | "trigger" | "full" | string;
}

export function Dropdown({
  trigger,
  placeholder = "Select option",
  items,
  value,
  onSelect,
  disabled = false,
  variant = "default",
  size = "md",
  position = "left",
  maxHeight = "320px",
  searchable = false,
  closeOnSelect = true,
  className = "",
  triggerClassName = "",
  menuClassName = "",
  itemClassName = "",
  width = "auto",
}: DropdownProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Filter items based on search
  const filteredItems = searchable
    ? items.filter((item) =>
        item.label?.toString().toLowerCase().includes(searchTerm.toLowerCase())
      )
    : items;

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
        setSearchTerm("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Handle keyboard navigation
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (!open) return;

      if (event.key === "Escape") {
        setOpen(false);
        setSearchTerm("");
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const handleSelect = (item: DropdownItem) => {
    if (item.disabled) return;

    if (item.onClick) {
      item.onClick();
    }

    if (item.value && onSelect) {
      onSelect(item.value);
    }

    if (closeOnSelect) {
      setOpen(false);
      setSearchTerm("");
    }
  };

  // Size classes
  const sizeClasses = {
    sm: "px-2 py-1 text-sm",
    md: "px-3 py-2 text-base",
    lg: "px-4 py-3 text-lg",
  };

  // Variant classes for trigger
  const variantClasses = {
    default: `
      bg-gradient-to-br from-white/25 to-slate-100/20 text-slate-700 dark:text-slate-100 
      border-2 border-white/30 hover:bg-gradient-to-br hover:from-indigo-100/80 
      hover:to-blue-100/60 hover:text-indigo-700 hover:border-indigo-200/50
      dark:hover:from-indigo-900/40 dark:hover:to-blue-900/30 dark:hover:text-indigo-200
      shadow-lg hover:shadow-xl backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-300
    `,
    button: `
      bg-white/20 text-white hover:bg-white/40 shadow-sm
      border border-white/20 hover:border-white/40
      focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-300
    `,
    minimal: `
      bg-transparent text-slate-700 dark:text-slate-100 
      border border-slate-300 dark:border-slate-600 
      hover:bg-slate-50 dark:hover:bg-slate-800
      focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-300
    `,
  };

  // Position classes
  const positionClasses = {
    left: "left-0",
    right: "right-0",
    center: "left-1/2 transform -translate-x-1/2",
  };

  // Width classes
  const getWidthClass = () => {
    if (width === "auto") return "w-auto min-w-48";
    if (width === "trigger") return "w-full";
    if (width === "full") return "w-screen";
    return width;
  };

  // Selected item
  const selectedItem = items.find((item) => item.value === value);

  return (
    <div className={`relative inline-block ${className}`} ref={dropdownRef}>
      {trigger ? (
        <div
          onClick={() => !disabled && setOpen(!open)}
          className={`cursor-pointer select-none ${
            disabled ? "opacity-50 cursor-not-allowed" : ""
          }`}
        >
          {trigger}
        </div>
      ) : (
        <button
          ref={triggerRef}
          type="button"
          onClick={() => !disabled && setOpen(!open)}
          disabled={disabled}
          className={`
            ${sizeClasses[size]} ${variantClasses[variant]} ${triggerClassName}
            flex items-center justify-between gap-3 rounded-lg
            transition-all duration-300 ease-in-out
            hover:scale-105 active:scale-95 select-none
            ${open ? "ring-2 ring-indigo-500/30" : ""}
            ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
            ${width === "trigger" ? "w-full" : "min-w-48"}
          `}
        >
          <div className="flex items-center gap-2">
            {selectedItem?.icon && <selectedItem.icon className="w-4 h-4" />}
            <span className="truncate">
              {selectedItem?.label || placeholder}
            </span>
          </div>
          <svg
            className={`w-4 h-4 transition-transform duration-200 ${
              open ? "rotate-180" : ""
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>
      )}

      {open && (
        <div
          className={`
            absolute ${positionClasses[position]} mt-2 ${getWidthClass()}
            rounded-xl shadow-2xl
            border border-slate-200 dark:border-slate-600
            backdrop-blur-sm bg-white/95 dark:bg-slate-800/95
            ring-1 ring-black/5 dark:ring-white/5
            z-50 overflow-hidden
            ${menuClassName}
          `}
          style={{ maxHeight }}
        >
          {searchable && (
            <div className="p-3 border-b border-slate-200 dark:border-slate-600">
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                autoFocus
              />
            </div>
          )}

          <div
            className="py-1 overflow-y-auto custom-scrollbar"
            style={{
              maxHeight: searchable ? `calc(${maxHeight} - 60px)` : maxHeight,
            }}
          >
            {filteredItems.length === 0 ? (
              <div className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                No options found
              </div>
            ) : (
              filteredItems.map((item, index) => (
                <div key={index}>
                  {item.divider ? (
                    <div className="my-1 border-t border-slate-200 dark:border-slate-600" />
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSelect(item)}
                      disabled={item.disabled}
                      className={`
                        w-full text-left px-4 py-2 text-sm flex items-center gap-3
                        transition-all duration-150 ease-in-out
                        ${
                          item.disabled
                            ? "text-slate-400 dark:text-slate-500 cursor-not-allowed"
                            : item.danger
                            ? "text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                            : "text-slate-700 dark:text-slate-200 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-blue-50 dark:hover:from-indigo-900/30 dark:hover:to-blue-900/30 hover:text-indigo-700 dark:hover:text-indigo-200"
                        }
                        ${
                          item.value === value
                            ? "bg-gradient-to-r from-indigo-100 to-blue-100 dark:from-indigo-900/50 dark:to-blue-900/50 text-indigo-700 dark:text-indigo-200 font-medium"
                            : ""
                        }
                        ${itemClassName}
                      `}
                    >
                      {item.icon && (
                        <item.icon className="w-4 h-4 flex-shrink-0" />
                      )}
                      <span className="truncate">{item.label}</span>
                      {item.value === value && (
                        <svg
                          className="w-4 h-4 ml-auto flex-shrink-0"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
