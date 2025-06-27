import { LucideProps } from "lucide-react";

interface SwitchProbe {
  name: string;
  property: boolean;
  setProperty: React.Dispatch<React.SetStateAction<boolean>>;
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

export function Switch({ name, property, setProperty }: SwitchProbe) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300 select-none">
        {name}
      </span>
      <button
        onClick={() => setProperty(!property)}
        className={`
      relative w-12 h-6 rounded-full transition-all duration-300 ease-in-out cursor-pointer
      ${
        property
          ? "bg-gradient-to-r from-cyan-400 to-blue-500 shadow-lg shadow-blue-500/30"
          : "bg-gray-300 dark:bg-gray-600"
      }
      hover:scale-105 active:scale-95
    `}
      >
        <div
          className={`
        absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-md
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
    transition-all duration-150 ease-in-out active:scale-95 select-none
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
    border-2 backdrop-blur-sm
    ${
      isActive
        ? "bg-gradient-to-br from-indigo-500/90 to-blue-600/90 text-white border-indigo-300/50 shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:from-indigo-400/95 hover:to-blue-500/95 dark:hover:from-indigo-600/95 dark:hover:to-blue-700/95"
        : "bg-gradient-to-br from-white/25 to-slate-100/20 text-slate-700 dark:text-slate-100 border-white/30 hover:bg-gradient-to-br hover:from-indigo-100/80 hover:to-blue-100/60 hover:text-indigo-700 hover:border-indigo-200/50"
    }
  `}
    >
      <Icon className="w-10 h-10" />
      {name}
      <h2 className="text-sm font-medium">{description}</h2>
    </button>
  );
}
