// Bird skin list + persistence. The built-in "classic" 8-bit bird is always
// the first choice; every image dropped into assets/birds/ (or the legacy
// assets/bird/ folder) becomes an additional selectable skin.

import { STORAGE_KEYS } from "./config.js";

export const CLASSIC_SKIN_ID = "classic";

export function buildSkinList(assets) {
  const classic = { id: CLASSIC_SKIN_ID, label: "CLASSIC", image: null };
  const custom = (assets.birds || []).map((b) => ({
    id: b.id,
    label: b.label,
    image: b.image,
  }));
  return [classic, ...custom];
}

export function loadSelectedSkinId() {
  try {
    return localStorage.getItem(STORAGE_KEYS.birdSkin) || CLASSIC_SKIN_ID;
  } catch {
    return CLASSIC_SKIN_ID;
  }
}

export function saveSelectedSkinId(id) {
  try {
    localStorage.setItem(STORAGE_KEYS.birdSkin, id);
  } catch {
    // ignore (e.g. private browsing storage errors)
  }
}

export function indexForSkinId(skins, id) {
  const idx = skins.findIndex((s) => s.id === id);
  return idx >= 0 ? idx : 0;
}
