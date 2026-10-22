import { create } from "zustand";
import { lightColors, darkColors, ThemeColors } from "./colors";
import { spacing, borderRadius, typography } from "./spacing";

export type ThemeMode = "light" | "dark";

interface ThemeState {
  mode: ThemeMode;
  colors: ThemeColors;
  spacing: typeof spacing;
  borderRadius: typeof borderRadius;
  typography: typeof typography;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
}

export const useTheme = create<ThemeState>((set, get) => ({
  mode: "light",
  colors: lightColors,
  spacing,
  borderRadius,
  typography,
  toggleTheme: () => {
    const next = get().mode === "light" ? "dark" : "light";
    set({
      mode: next,
      colors: next === "light" ? lightColors : darkColors,
    });
  },
  setTheme: (mode: ThemeMode) => {
    set({
      mode,
      colors: mode === "light" ? lightColors : darkColors,
    });
  },
}));

export * from "./colors";
export * from "./spacing";
