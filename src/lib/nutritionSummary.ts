import { ParsedNutritionData } from "./parseNutrition";
import { DietaryProfile } from "./storage";

export type TagType = "positive" | "caution" | "neutral";

export interface NutritionTag {
  id: string;
  label: string;
  type: TagType;
  detail: string;
}

/**
 * Generates rule-based nutrition summary tags using standard reference thresholds,
 * adjusted deterministically when a dietary profile is configured.
 * Simple, transparent, and pure TypeScript.
 */
export function generateNutritionSummary(
  data: ParsedNutritionData,
  profile?: DietaryProfile | null
): NutritionTag[] {
  const profileTags: NutritionTag[] = [];
  const standardTags: NutritionTag[] = [];

  const isDiabetic = Boolean(profile?.conditions?.diabetic);
  const isBloodPressure = Boolean(profile?.conditions?.bloodPressure);
  const isCholesterol = Boolean(profile?.conditions?.cholesterol);

  // 1. Sugar Evaluation (Standard threshold: > 12g caution, <= 2g low; Diabetic: >= 5g caution)
  if (data.sugar) {
    const s = data.sugar.value;
    if (isDiabetic && s >= 5) {
      profileTags.push({
        id: "profile-high-sugar",
        label: "High sugar for your profile",
        type: "caution",
        detail: `${s}g sugar per serving (stricter diabetic threshold: ≥ 5g)`,
      });
    } else if (s > 12) {
      standardTags.push({
        id: "high-sugar",
        label: "High Sugar",
        type: "caution",
        detail: `${s}g sugar per serving (exceeds 12g threshold)`,
      });
    } else if (s <= 2) {
      standardTags.push({
        id: "low-sugar",
        label: "Low Sugar",
        type: "positive",
        detail: `${s}g sugar per serving (≤ 2g per serving)`,
      });
    }
  }

  // 2. Sodium Evaluation (Standard: > 400mg; Blood Pressure: >= 200mg)
  if (data.sodium) {
    const sod = data.sodium.value;
    const mg = data.sodium.unit === "g" ? sod * 1000 : sod;

    if (isBloodPressure && mg >= 200) {
      profileTags.push({
        id: "profile-high-sodium",
        label: "High sodium for your profile",
        type: "caution",
        detail: `${mg}mg sodium per serving (stricter blood pressure threshold: ≥ 200mg)`,
      });
    } else if (mg > 400) {
      standardTags.push({
        id: "high-sodium",
        label: "High Sodium",
        type: "caution",
        detail: `${mg}mg sodium per serving (high sodium threshold > 400mg)`,
      });
    } else if (mg <= 35) {
      standardTags.push({
        id: "very-low-sodium",
        label: "Very Low Sodium",
        type: "positive",
        detail: `${mg}mg sodium per serving (FDA ≤ 35mg standard)`,
      });
    } else if (mg <= 140) {
      standardTags.push({
        id: "low-sodium",
        label: "Low Sodium",
        type: "positive",
        detail: `${mg}mg sodium per serving (FDA ≤ 140mg standard)`,
      });
    }
  }

  // 3. Total Fat Evaluation (Standard: >= 15g; Cholesterol: >= 8g)
  if (data.fats) {
    const fat = data.fats.value;
    if (isCholesterol && fat >= 8) {
      profileTags.push({
        id: "profile-high-fat",
        label: "High fat for your profile",
        type: "caution",
        detail: `${fat}g total fat per serving (stricter cholesterol threshold: ≥ 8g)`,
      });
    } else if (fat >= 15) {
      standardTags.push({
        id: "high-fat",
        label: "High Fat",
        type: "caution",
        detail: `${fat}g total fat per serving`,
      });
    } else if (fat <= 3) {
      standardTags.push({
        id: "low-fat",
        label: "Low Fat",
        type: "positive",
        detail: `${fat}g total fat (FDA ≤ 3g standard)`,
      });
    }
  }

  // 4. Protein Evaluation
  if (data.protein) {
    const p = data.protein.value;
    if (p >= 10) {
      standardTags.push({
        id: "high-protein",
        label: "High Protein",
        type: "positive",
        detail: `${p}g protein per serving (≥ 20% Daily Value)`,
      });
    } else if (p >= 5) {
      standardTags.push({
        id: "good-protein",
        label: "Good Protein Source",
        type: "positive",
        detail: `${p}g protein per serving (≥ 10% Daily Value)`,
      });
    }
  }

  // 5. Dietary Fiber Evaluation
  if (data.fiber) {
    const f = data.fiber.value;
    if (f >= 5) {
      standardTags.push({
        id: "high-fiber",
        label: "High Fiber",
        type: "positive",
        detail: `${f}g fiber per serving (≥ 20% Daily Value)`,
      });
    } else if (f >= 2.8) {
      standardTags.push({
        id: "good-fiber",
        label: "Good Fiber Source",
        type: "positive",
        detail: `${f}g fiber per serving (≥ 10% Daily Value)`,
      });
    }
  }

  // 6. Calories Evaluation (if under 3 tags so far)
  if (profileTags.length + standardTags.length < 3 && data.calories) {
    const cal = data.calories.value;
    if (cal <= 40) {
      standardTags.push({
        id: "low-calorie",
        label: "Low Calorie",
        type: "neutral",
        detail: `${cal} kcal per serving (≤ 40 kcal)`,
      });
    } else if (cal >= 400) {
      standardTags.push({
        id: "high-calorie",
        label: "Calorie Dense",
        type: "neutral",
        detail: `${cal} kcal per serving`,
      });
    }
  }

  // Prioritize profile-specific tags at top, up to 5 total tags
  return [...profileTags, ...standardTags].slice(0, 5);
}
