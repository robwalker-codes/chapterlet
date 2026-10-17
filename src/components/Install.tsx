import { useEffect, useState } from "react";
import { Download, Share } from "lucide-react";
interface InstallEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
}
export function Install() {
  const [prompt, setPrompt] = useState<InstallEvent | null>(null),
    [installed, setInstalled] = useState(
      () => window.matchMedia("(display-mode: standalone)").matches,
    );
  const ios =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setPrompt(e as InstallEvent);
    };
    const done = () => {
      setInstalled(true);
      setPrompt(null);
    };
    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", done);
    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", done);
    };
  }, []);
  return installed ? (
    <p>Chapterlet is running as an installed app.</p>
  ) : prompt ? (
    <button
      onClick={async () => {
        await prompt.prompt();
        await prompt.userChoice;
        setPrompt(null);
      }}
    >
      <Download size={17} /> Install Chapterlet
    </button>
  ) : ios ? (
    <p>
      <Share size={16} /> In Safari, tap <strong>Share</strong>, then{" "}
      <strong>Add to Home Screen</strong>. Open Chapterlet once online so its
      pages can be cached.
    </p>
  ) : (
    <p>
      To install, look for your browser’s install icon or “Install app” menu
      option. Installation availability depends on your browser; you can always
      read here in the browser.
    </p>
  );
}
