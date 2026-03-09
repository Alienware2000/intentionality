// =============================================================================
// SOUND SETTINGS HOOK
// Persisted sound preferences for the focus timer (localStorage).
// =============================================================================

import { useState, useCallback, useEffect } from "react";
import { soundEngine, type SoundType } from "@/app/lib/sounds";

const STORAGE_KEY = "focus-sound-settings";

type SoundSettings = {
  muted: boolean;
  volume: number;
};

const DEFAULTS: SoundSettings = { muted: false, volume: 0.7 };

function loadSettings(): SoundSettings {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<SoundSettings>;
    return {
      muted: typeof parsed.muted === "boolean" ? parsed.muted : DEFAULTS.muted,
      volume: typeof parsed.volume === "number" ? parsed.volume : DEFAULTS.volume,
    };
  } catch {
    return DEFAULTS;
  }
}

function saveSettings(settings: SoundSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // localStorage unavailable
  }
}

export function useSoundSettings() {
  const [muted, setMutedState] = useState(DEFAULTS.muted);
  const [volume, setVolumeState] = useState(DEFAULTS.volume);

  // Load from localStorage on mount
  useEffect(() => {
    const s = loadSettings();
    setMutedState(s.muted);
    setVolumeState(s.volume);
    soundEngine.setMuted(s.muted);
    soundEngine.setVolume(s.volume);
  }, []);

  const setMuted = useCallback((m: boolean) => {
    setMutedState(m);
    soundEngine.setMuted(m);
    saveSettings({ muted: m, volume: soundEngine.getVolume() });
  }, []);

  const setVolume = useCallback((v: number) => {
    setVolumeState(v);
    soundEngine.setVolume(v);
    saveSettings({ muted: soundEngine.isMuted(), volume: v });
  }, []);

  const playSound = useCallback((type: SoundType) => {
    soundEngine.play(type);
  }, []);

  return { muted, volume, setMuted, setVolume, playSound };
}
