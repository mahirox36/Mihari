import { Settings, Sparkles } from "lucide-react";

export function Switch({
  name,
  description,
  property,
  setProperty,
  icon: Icon,
}: {
  name: string;
  description: string;
  property: boolean;
  setProperty: React.Dispatch<React.SetStateAction<boolean>>;
  icon?: any;
}) {
  return (
    <div className="group relative p-4 rounded-2xl bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-sm border border-white/10 hover:border-cyan-400/30 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/10">
      <div className="flex items-center gap-4 justify-between">
        <div className="flex items-center gap-3">
          {Icon && (
            <Icon className="w-5 h-5 text-cyan-400 group-hover:text-cyan-300 transition-colors" />
          )}
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-white/90 group-hover:text-white transition-colors">
              {name}
            </span>
            <span className="flex-initial w-44 text-xs text-white/60 group-hover:text-white/70 transition-colors">
              {description}
            </span>
          </div>
        </div>
        <button
          onClick={() => setProperty(!property)}
          className={`relative w-14 h-7 rounded-full transition-all duration-300 ease-out cursor-pointer transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--focus-ring)] ${
            property
              ? "bg-gradient-to-r from-[var(--switch-on-from)] via-[var(--switch-on-via)] to-[var(--switch-on-to)] shadow-[var(--switch-shadow)]"
              : "bg-[var(--switch-off-bg)]/20 hover:bg-[var(--dark-switch-off-bg)]/30"
          }`}
        >
          <div
            className={`absolute top-0.5 w-6 h-6 bg-[var(--switch-circle-bg)] rounded-full shadow-md transition-all duration-300 ease-out flex items-center justify-center ${
              property ? "left-7 rotate-180" : "left-0.5"
            }`}
          >
            {property && <Sparkles className="w-3 h-3 text-cyan-500" />}
          </div>
        </button>
      </div>
    </div>
  );
}

export function TextInput({
  name,
  description,
  value,
  setValue,
  placeholder,
  type = "text",
  rightButton,
  icon: Icon,
}: {
  name: string;
  description: string;
  value: string;
  setValue: (v: string) => void;
  placeholder?: string;
  type?: string;
  rightButton?: React.ReactNode;
  icon?: any;
}) {
  return (
    <div className="group relative p-4 rounded-2xl bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-sm border border-white/10 hover:border-cyan-400/30 transition-all duration-300">
      <div className="flex items-center gap-3 mb-2">
        {Icon && (
          <Icon className="w-4 h-4 text-cyan-400 group-hover:text-cyan-300 transition-colors" />
        )}
        <span className="text-sm font-semibold text-white/90 group-hover:text-white transition-colors">
          {name}
        </span>
      </div>
      <span className="text-xs text-white/60 group-hover:text-white/70 transition-colors mb-3 block">
        {description}
      </span>
      <div className="flex items-center gap-2">
        <input
          type={type}
          className="flex-1 p-3 rounded-xl bg-white/5 border border-white/20 shadow-inner text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400/50 transition-all duration-300 backdrop-blur-sm hover:bg-white/10"
          placeholder={placeholder}
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        {rightButton}
      </div>
    </div>
  );
}

export function NumberInput({
  name,
  description,
  value,
  setValue,
  min,
  max,
  icon: Icon,
}: {
  name: string;
  description: string;
  value: number;
  setValue: (v: number) => void;
  min: number;
  max: number;
  icon?: any;
}) {
  return (
    <div className="group relative overflow-visible p-4 rounded-2xl bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-sm border border-white/10 hover:border-cyan-400/30 transition-all duration-300">
      <div className="flex items-center gap-3 mb-2">
        {Icon && (
          <Icon className="w-4 h-4 text-cyan-400 group-hover:text-cyan-300 transition-colors" />
        )}
        <span className="text-sm font-semibold text-white/90 group-hover:text-white transition-colors">
          {name}
        </span>
      </div>
      <span className="text-xs text-white/60 group-hover:text-white/70 transition-colors mb-3 block">
        {description}
      </span>
      <input
        type="number"
        min={min}
        max={max}
        className="w-full p-3 rounded-xl bg-white/5 border border-white/20 shadow-inner text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400/50 transition-all duration-300 backdrop-blur-sm hover:bg-white/10"
        value={value === 0 ? "" : value}
        onChange={(e) => {
          const val = e.target.value;
          if (val === "") setValue(0);
          else setValue(Number(val));
        }}
        onFocus={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        autoComplete="off"
      />
    </div>
  );
}

export function CustomOptionsInput({
  value,
  setValue,
}: {
  value: string;
  setValue: (v: string) => void;
}) {
  return (
    <div className="group relative p-4 rounded-2xl bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-sm border border-white/10 hover:border-cyan-400/30 transition-all duration-300">
      <div className="flex items-center gap-3 mb-2">
        <Settings className="w-4 h-4 text-cyan-400 group-hover:text-cyan-300 transition-colors" />
        <span className="text-sm font-semibold text-white/90 group-hover:text-white transition-colors">
          Custom Options
        </span>
      </div>
      <span className="text-xs text-white/60 group-hover:text-white/70 transition-colors mb-3 block">
        Enter custom options as JSON
      </span>
      <textarea
        className="w-full p-3 rounded-xl bg-white/5 border border-white/20 shadow-inner text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400/50 transition-all duration-300 backdrop-blur-sm hover:bg-white/10 min-h-[80px] resize-none"
        placeholder='{"option": "value"}'
        value={value}
        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
          setValue(e.target.value)
        }
      />
    </div>
  );
}
