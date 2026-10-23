"use client";

import { useSyncExternalStore } from "react";
import { soundOn, subscribeSound } from "@/lib/sound";

/** Whether interface sounds are on (always false during server render). */
export function useSound() {
  return useSyncExternalStore(subscribeSound, soundOn, () => false);
}
