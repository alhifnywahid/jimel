/**
 * Preferences registry - Vite/browser version (no Next server-cookie).
 * All persistence uses a client-cookie (document.cookie), re-read at boot by the
 * script in index.html. The structure & data-* attributes are kept identical to the
 * source dashboard so all of its UI components work as-is.
 */

import { fontKeys } from "@/lib/fonts/registry";

import {
  CONTENT_LAYOUT_VALUES,
  NAVBAR_STYLE_VALUES,
  SIDEBAR_COLLAPSIBLE_VALUES,
  SIDEBAR_VARIANT_VALUES,
} from "./layout";
import { THEME_MODE_VALUES, THEME_PRESET_VALUES } from "./theme";

export type PreferencePersistence = "none" | "client-cookie" | "localStorage";

type PreferenceDefinition<Values extends readonly string[], Attribute extends `data-${string}`> = {
  values: Values;
  defaultValue: Values[number];
  persistence: PreferencePersistence;
  attribute: Attribute;
};

function definePreference<
  const Values extends readonly string[],
  const Attribute extends `data-${string}`,
>(definition: PreferenceDefinition<Values, Attribute>) {
  return definition;
}

export const PREFERENCE_REGISTRY = {
  theme_mode: definePreference({
    values: THEME_MODE_VALUES,
    defaultValue: "light",
    persistence: "client-cookie",
    attribute: "data-theme-mode",
  }),
  theme_preset: definePreference({
    values: THEME_PRESET_VALUES,
    defaultValue: "default",
    persistence: "client-cookie",
    attribute: "data-theme-preset",
  }),
  font: definePreference({
    values: fontKeys,
    defaultValue: "geist",
    persistence: "client-cookie",
    attribute: "data-font",
  }),
  content_layout: definePreference({
    values: CONTENT_LAYOUT_VALUES,
    defaultValue: "centered",
    persistence: "client-cookie",
    attribute: "data-content-layout",
  }),
  navbar_style: definePreference({
    values: NAVBAR_STYLE_VALUES,
    defaultValue: "sticky",
    persistence: "client-cookie",
    attribute: "data-navbar-style",
  }),
  sidebar_variant: definePreference({
    values: SIDEBAR_VARIANT_VALUES,
    defaultValue: "sidebar",
    persistence: "client-cookie",
    attribute: "data-sidebar-variant",
  }),
  sidebar_collapsible: definePreference({
    values: SIDEBAR_COLLAPSIBLE_VALUES,
    defaultValue: "icon",
    persistence: "client-cookie",
    attribute: "data-sidebar-collapsible",
  }),
} as const;

export type PreferenceKey = keyof typeof PREFERENCE_REGISTRY;

export type PreferenceValueMap = {
  [K in PreferenceKey]: (typeof PREFERENCE_REGISTRY)[K]["values"][number];
};

export const PREFERENCE_KEYS = Object.freeze(Object.keys(PREFERENCE_REGISTRY) as PreferenceKey[]);

export function getPreferencePersistence(key: PreferenceKey): PreferencePersistence {
  return PREFERENCE_REGISTRY[key].persistence;
}

export const PREFERENCE_DEFAULTS = Object.fromEntries(
  PREFERENCE_KEYS.map((key) => [key, PREFERENCE_REGISTRY[key].defaultValue]),
) as PreferenceValueMap;

export function parsePreference<K extends PreferenceKey>(
  key: K,
  rawValue: string | null | undefined,
): PreferenceValueMap[K] {
  const definition = PREFERENCE_REGISTRY[key];
  const allowedValues = definition.values as readonly string[];
  if (rawValue && allowedValues.includes(rawValue)) {
    return rawValue as PreferenceValueMap[K];
  }
  return definition.defaultValue as PreferenceValueMap[K];
}
