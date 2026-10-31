import { ParsedNutritionData } from "./parseNutrition";
import { ParsedIngredientsData } from "./parseIngredients";
import { NutritionTag } from "./nutritionSummary";
export interface ExplanationData {
  explanation: string;
  takeaway: string;
}

export interface DietaryConditions {
  diabetic: boolean;      // Diabetic / watching sugar
  bloodPressure: boolean; // High blood pressure / watching sodium
  cholesterol: boolean;   // Watching cholesterol / fat
}

export type DietType = "none" | "vegetarian" | "vegan";

export interface DietaryProfile {
  conditions: DietaryConditions;
  allergens: string[];
  dietType: DietType;
}

export interface ScanRecord {
  id: string;
  timestamp: number;
  productName: string;
  nutrition: ParsedNutritionData;
  ingredientsData: ParsedIngredientsData;
  summaryTags: NutritionTag[];
  explanationData: ExplanationData | null;
  ocrResult?: {
    text: string;
    confidence: number;
    lines: string[];
  };
  validationFlags?: Record<string, string>;
  thumbnail?: string;
}

export const DEFAULT_DIETARY_PROFILE: DietaryProfile = {
  conditions: {
    diabetic: false,
    bloodPressure: false,
    cholesterol: false,
  },
  allergens: [],
  dietType: "none",
};

const HISTORY_STORAGE_KEY = "nutriscan_history_v1";
const PROFILE_STORAGE_KEY = "nutriscan_profile_v1";
const MAX_HISTORY_RECORDS = 50;

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

/**
 * Checks if a scan has sufficient detected data to be worth saving.
 * Scans with zero detected nutrients and zero ingredients are not saved.
 */
export function isUsefulScan(
  nutrition: ParsedNutritionData | null | undefined,
  ingredients: ParsedIngredientsData | null | undefined
): boolean {
  if (!nutrition && !ingredients) return false;
  const nutrientCount = nutrition?.detectedCount ?? 0;
  const ingredientCount = ingredients?.ingredients?.length ?? 0;
  return nutrientCount > 0 || ingredientCount > 0;
}

/**
 * Checks whether the dietary profile has any active filters set.
 */
export function hasActiveProfile(profile: DietaryProfile | null | undefined): boolean {
  if (!profile) return false;
  const hasConditions =
    profile.conditions.diabetic ||
    profile.conditions.bloodPressure ||
    profile.conditions.cholesterol;
  const hasAllergens = profile.allergens.length > 0;
  const hasDiet = profile.dietType !== "none";
  return hasConditions || hasAllergens || hasDiet;
}

/**
 * Retrieves the user's saved dietary profile with SSR safety.
 */
export function getDietaryProfile(): DietaryProfile {
  if (!isBrowser()) {
    return DEFAULT_DIETARY_PROFILE;
  }

  try {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) return DEFAULT_DIETARY_PROFILE;
    const parsed = JSON.parse(raw);
    return {
      conditions: {
        diabetic: Boolean(parsed?.conditions?.diabetic),
        bloodPressure: Boolean(parsed?.conditions?.bloodPressure),
        cholesterol: Boolean(parsed?.conditions?.cholesterol),
      },
      allergens: Array.isArray(parsed?.allergens) ? parsed.allergens : [],
      dietType:
        parsed?.dietType === "vegetarian" || parsed?.dietType === "vegan"
          ? parsed.dietType
          : "none",
    };
  } catch (err) {
    console.error("Failed to read dietary profile from localStorage:", err);
    return DEFAULT_DIETARY_PROFILE;
  }
}

/**
 * Saves the dietary profile to localStorage with SSR safety.
 */
export function saveDietaryProfile(profile: DietaryProfile): boolean {
  if (!isBrowser()) return false;

  try {
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
    return true;
  } catch (err) {
    console.error("Failed to save dietary profile to localStorage:", err);
    return false;
  }
}

/**
 * Resets dietary profile to initial default values.
 */
export function resetDietaryProfile(): DietaryProfile {
  if (isBrowser()) {
    try {
      localStorage.removeItem(PROFILE_STORAGE_KEY);
    } catch (err) {
      console.error("Failed to reset dietary profile:", err);
    }
  }
  return DEFAULT_DIETARY_PROFILE;
}

/**
 * Retrieves all saved scan records, sorted newest first.
 */
export function getScanHistory(): ScanRecord[] {
  if (!isBrowser()) return [];

  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    if (!Array.isArray(list)) return [];
    return list;
  } catch (err) {
    console.error("Failed to read scan history from localStorage:", err);
    return [];
  }
}

/**
 * Retrieves a single scan record by ID.
 */
export function getScanRecordById(id: string): ScanRecord | null {
  const history = getScanHistory();
  return history.find((item) => item.id === id) || null;
}

/**
 * Saves a new scan record.
 * Caps history at 50 records.
 */
export function saveScanRecord(
  data: Omit<ScanRecord, "id" | "timestamp"> & {
    id?: string;
    timestamp?: number;
  }
): ScanRecord | null {
  if (!isBrowser()) return null;

  if (!isUsefulScan(data.nutrition, data.ingredientsData)) {
    return null;
  }

  const newRecord: ScanRecord = {
    id: data.id || `scan_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: data.timestamp || Date.now(),
    productName: data.productName?.trim() || "Unnamed product",
    nutrition: data.nutrition,
    ingredientsData: data.ingredientsData,
    summaryTags: data.summaryTags || [],
    explanationData: data.explanationData || null,
    ocrResult: data.ocrResult,
    validationFlags: data.validationFlags,
    thumbnail: data.thumbnail,
  };

  try {
    const currentHistory = getScanHistory();
    // Prepend new record, cap at 50
    const updated = [newRecord, ...currentHistory.filter((item) => item.id !== newRecord.id)].slice(
      0,
      MAX_HISTORY_RECORDS
    );
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updated));
    return newRecord;
  } catch (err) {
    console.error("Failed to save scan record to localStorage:", err);
    // Attempt fallback: clear oldest items if storage is full
    try {
      const currentHistory = getScanHistory();
      const trimmed = [newRecord, ...currentHistory.slice(0, 20)];
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(trimmed));
      return newRecord;
    } catch {
      return null;
    }
  }
}

/**
 * Updates an existing scan record (e.g., renaming product or attaching AI explanation).
 */
export function updateScanRecord(id: string, updates: Partial<ScanRecord>): boolean {
  if (!isBrowser()) return false;

  try {
    const currentHistory = getScanHistory();
    const index = currentHistory.findIndex((item) => item.id === id);
    if (index === -1) return false;

    currentHistory[index] = {
      ...currentHistory[index],
      ...updates,
      id: currentHistory[index].id, // preserve id
      timestamp: currentHistory[index].timestamp, // preserve original timestamp
    };

    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(currentHistory));
    return true;
  } catch (err) {
    console.error(`Failed to update scan record ${id}:`, err);
    return false;
  }
}

/**
 * Deletes a single scan record by ID.
 */
export function deleteScanRecord(id: string): boolean {
  if (!isBrowser()) return false;

  try {
    const currentHistory = getScanHistory();
    const filtered = currentHistory.filter((item) => item.id !== id);
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(filtered));
    return true;
  } catch (err) {
    console.error(`Failed to delete scan record ${id}:`, err);
    return false;
  }
}

/**
 * Clears all scan history records.
 */
export function clearScanHistory(): boolean {
  if (!isBrowser()) return false;

  try {
    localStorage.removeItem(HISTORY_STORAGE_KEY);
    return true;
  } catch (err) {
    console.error("Failed to clear scan history:", err);
    return false;
  }
}
