import { usePreferences } from "../hooks/data";
import { savePreferences } from "../services/repository";
import { useAction } from "./UI";
import type { Preferences as Prefs } from "../models/types";
export function Preferences() {
  const prefs = usePreferences(),
    act = useAction();
  const save = (patch: Partial<Prefs>) =>
    void act(() => savePreferences(patch));
  return (
    <div className="preferences">
      <fieldset>
        <legend>Page colour</legend>
        <div className="theme-options">
          {(["light", "sepia", "dark"] as const).map((theme) => (
            <button
              key={theme}
              className={`theme-swatch ${theme}`}
              aria-pressed={prefs.theme === theme}
              onClick={() => save({ theme })}
            >
              Aa<span>{theme}</span>
            </button>
          ))}
        </div>
      </fieldset>
      <label>
        Reading font
        <select
          value={prefs.font}
          onChange={(e) => save({ font: e.target.value as Prefs["font"] })}
        >
          <option value="serif">Lora · Serif</option>
          <option value="sans">DM Sans · Sans serif</option>
        </select>
      </label>
      <label>
        Font size <span>{prefs.fontSize}px</span>
        <input
          aria-label="Font size"
          type="range"
          min={16}
          max={32}
          step={1}
          value={prefs.fontSize}
          onChange={(e) => save({ fontSize: Number(e.target.value) })}
        />
      </label>
      <label>
        Line spacing <span>{prefs.lineHeight.toFixed(2)}</span>
        <input
          aria-label="Line spacing"
          type="range"
          min={1.4}
          max={2.4}
          step={0.05}
          value={prefs.lineHeight}
          onChange={(e) => save({ lineHeight: Number(e.target.value) })}
        />
      </label>
    </div>
  );
}
