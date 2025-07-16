import { X, Settings, Sparkles, FileText, Image, Clock, Globe, Zap } from "lucide-react";
import { CustomOptionsInput, NumberInput, Switch, TextInput } from "./inputs";

interface AdvanceSidebarProp {
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;

  writeSubs: boolean;
  setWriteSubs: React.Dispatch<React.SetStateAction<boolean>>;

  subtitleLang: string;
  setSubtitleLang: React.Dispatch<React.SetStateAction<string>>;

  writeThumbnail: boolean;
  setWriteThumbnail: React.Dispatch<React.SetStateAction<boolean>>;

  writeInfoJson: boolean;
  setWriteInfoJson: React.Dispatch<React.SetStateAction<boolean>>;

  customFilename: string;
  setCustomFilename: React.Dispatch<React.SetStateAction<string>>;

  cookiesFile: string;
  setCookiesFile: React.Dispatch<React.SetStateAction<string>>;

  proxy: string;
  setProxy: React.Dispatch<React.SetStateAction<string>>;

  rateLimit: string;
  setRateLimit: React.Dispatch<React.SetStateAction<string>>;

  retries: number;
  setRetries: React.Dispatch<React.SetStateAction<number>>;

  fragmentRetries: number;
  setFragmentRetries: React.Dispatch<React.SetStateAction<number>>;

  customOptions: string;
  setCustomOptions: React.Dispatch<React.SetStateAction<string>>;

}

export function AdvanceSidebar({ isOpen, setIsOpen, writeSubs, setWriteSubs, subtitleLang, setSubtitleLang, writeThumbnail, setWriteThumbnail, writeInfoJson, setWriteInfoJson, customFilename, setCustomFilename, cookiesFile, setCookiesFile, proxy, setProxy, rateLimit, setRateLimit, retries, setRetries, fragmentRetries, setFragmentRetries, customOptions, setCustomOptions }: AdvanceSidebarProp) {
  async function handleSelectCookiesFile() {
    if (window.api && window.api.selectCookieFile) {
      const result = await window.api.selectCookieFile();
      if (result.success && result.path) {
        setCookiesFile(result.path);
      }
    }
  }

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 h-full bg-black/20 backdrop-blur-sm transition-opacity duration-300 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
      
      {/* Main sidebar */}
      <div
        className={`fixed top-10 right-0 w-96 max-w-full bg-gradient-to-br from-slate-900/95 via-blue-900/90 to-indigo-900/95 backdrop-blur-2xl border-l border-white/10 z-50 transform transition-all duration-500 ease-out ${
          isOpen ? "translate-x-0 shadow-2xl shadow-black/50" : "translate-x-full"
        }`}
        style={{ 
          height: "calc(100vh - 2.5rem)", // 4rem = 64px, adjust if your toolbar is a different height
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 58, 138, 0.9) 50%, rgba(67, 56, 202, 0.95) 100%)'
        }}
      >
        {isOpen && (
          <div className="absolute inset-0 overflow-hidden rounded-l-[32px] pointer-events-none">
            <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-cyan-400/20 to-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute -bottom-40 -right-40 w-80 h-80 bg-gradient-to-br from-indigo-400/20 to-purple-500/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
          </div>
        )}

        {/* Header */}
        <div className="relative z-10 p-6 border-b border-white/10 bg-gradient-to-r from-white/5 to-white/10 backdrop-blur-sm">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-500/30">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl font-bold text-white tracking-wide">Advanced Options</h2>
            </div>
            <button
              className="w-10 h-10 flex items-center justify-center hover:bg-red-500/20 transition-all duration-200 rounded-xl border border-white/10 hover:border-red-400/50 group"
              onClick={() => setIsOpen(false)}
            >
              <X className="w-5 h-5 text-white/70 group-hover:text-red-400 transition-colors" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="relative z-10 p-6 overflow-y-auto max-h-[calc(100vh-100px)] space-y-6 custom-scrollbar">
          {/* Subtitle Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-400/20 to-blue-500/20 flex items-center justify-center">
                <FileText className="w-4 h-4 text-cyan-400" />
              </div>
              <h3 className="text-lg font-semibold text-white/90">Subtitles</h3>
            </div>
            <Switch
              name="Write Subtitles"
              description="Generate subtitle files for videos"
              property={writeSubs}
              setProperty={setWriteSubs}
              icon={FileText}
            />
            <TextInput
              name="Subtitle Language"
              description="Language code for subtitles (e.g., 'en', 'es', 'fr')"
              value={subtitleLang}
              setValue={setSubtitleLang}
              placeholder="en"
              icon={Globe}
            />
          </div>

          {/* Media Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-400/20 to-indigo-500/20 flex items-center justify-center">
                <Image className="w-4 h-4 text-purple-400" />
              </div>
              <h3 className="text-lg font-semibold text-white/90">Media Files</h3>
            </div>
            <Switch
              name="Download Thumbnail"
              description="Save thumbnail images alongside videos"
              property={writeThumbnail}
              setProperty={setWriteThumbnail}
              icon={Image}
            />
            <Switch
              name="Save Info JSON"
              description="Create detailed metadata files"
              property={writeInfoJson}
              setProperty={setWriteInfoJson}
              icon={FileText}
            />
          </div>

          {/* Configuration Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-green-400/20 to-teal-500/20 flex items-center justify-center">
                <Settings className="w-4 h-4 text-green-400" />
              </div>
              <h3 className="text-lg font-semibold text-white/90">Configuration</h3>
            </div>
            <TextInput
              name="Custom Filename"
              description="Template for naming downloaded files"
              value={customFilename}
              setValue={setCustomFilename}
              placeholder="%(title)s.%(ext)s"
              icon={FileText}
            />
            <TextInput
              name="Cookies File"
              description="Authentication cookies for private content"
              value={cookiesFile}
              setValue={setCookiesFile}
              placeholder="Select cookies file..."
              icon={FileText}
              rightButton={
                <button 
                  type="button" 
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white text-sm font-medium transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-300"
                  onClick={handleSelectCookiesFile}
                >
                  Browse
                </button>
              }
            />
            <TextInput
              name="Proxy Server"
              description="Route downloads through proxy server"
              value={proxy}
              setValue={setProxy}
              placeholder="http://proxy:port"
              icon={Globe}
            />
            <TextInput
              name="Rate Limit"
              description="Limit download speed (e.g., '1M', '500K')"
              value={rateLimit}
              setValue={setRateLimit}
              placeholder="1M"
              icon={Zap}
            />
          </div>

          {/* Performance Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-400/20 to-red-500/20 flex items-center justify-center">
                <Clock className="w-4 h-4 text-orange-400" />
              </div>
              <h3 className="text-lg font-semibold text-white/90">Performance</h3>
            </div>
            <NumberInput
              name="Download Retries"
              description="Retry failed downloads (0-10)"
              value={retries}
              setValue={setRetries}
              min={0}
              max={10}
              icon={Clock}
            />
            <NumberInput
              name="Fragment Retries"
              description="Retry failed video fragments (0-10)"
              value={fragmentRetries}
              setValue={setFragmentRetries}
              min={0}
              max={10}
              icon={Clock}
            />
          </div>

          {/* Advanced Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-400/20 to-purple-500/20 flex items-center justify-center">
                <Settings className="w-4 h-4 text-violet-400" />
              </div>
              <h3 className="text-lg font-semibold text-white/90">Advanced</h3>
            </div>
            <CustomOptionsInput value={customOptions} setValue={setCustomOptions} />
          </div>
        </div>
      </div>
    </>
  );
}