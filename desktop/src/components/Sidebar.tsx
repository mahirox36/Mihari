import { Home, Download, Settings } from "lucide-react";
import { Button } from "./Keys";

interface SidebarProps {
  activePage: string;
  setActivePage: React.Dispatch<React.SetStateAction<string>>;
}

export function Sidebar({ activePage, setActivePage }: SidebarProps) {
  return (
    <div className="flex-none flex flex-col w-64 bg-gradient-to-tl from-teal-300 via-blue-500 to-indigo-600 dark:from-cyan-900 dark:via-blue-800 dark:to-indigo-700 text-white p-6 shadow-lg">
      <div className="text-4xl font-extrabold mb-12 tracking-wide select-none cursor-default">
        Mihari
      </div>

      <nav className="flex flex-col space-y-4">
        <Button
          name="Home"
          Icon={Home}
          property={activePage}
          setProperty={setActivePage}
        ></Button>
        <Button
          name="Downloads"
          Icon={Download}
          property={activePage}
          setProperty={setActivePage}
        ></Button>
        <Button
          name="Settings"
          Icon={Settings}
          property={activePage}
          setProperty={setActivePage}
        ></Button>
      </nav>
    </div>
  );
}
