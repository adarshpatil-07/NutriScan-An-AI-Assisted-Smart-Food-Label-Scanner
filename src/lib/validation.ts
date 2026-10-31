import { ParsedNutritionData } from "./parseNutrition";

export interface NutritionValidationResult {
  flags: Record<string, string>; // Maps nutrient key ("sugar", "carbs", "calories", etc.) to caution message
  warnings: string[]; // List of human-readable warnings for AI prompt & notices
  hasIssues: boolean;
}

/**
 * Validates extracted nutrition values against common sanity boundaries.
 * Flags implausible values (e.g. sugar > carbs, macro > 100g/serving, digit misreads)
 * WITHOUT modifying any of the numbers.
 */
export function validateNutritionValues(
  data: ParsedNutritionData | null | undefined
): NutritionValidationResult {
  const flags: Record<string, string> = {};
  const warnings: string[] = [];

  if (!data) {
    return { flags, warnings, hasIssues: false };
  }

  // 1. Sugar greater than total carbohydrates
  if (data.sugar && data.carbs) {
    const s = data.sugar.value;
    const c = data.carbs.value;
    // Allow tiny margin for rounding differences (e.g. 0.1g)
    if (s > c + 0.5) {
      const msg = `Sugar (${s}g) exceeds total carbs (${c}g)`;
      flags.sugar = msg;
      flags.carbs = msg;
      warnings.push(`Extracted sugar (${s}g) is higher than total carbohydrates (${c}g), indicating a possible OCR misread.`);
    }
  }

  // 2. Individual macros above 100g for a typical per-serving label
  const macroChecks: Array<{ key: keyof ParsedNutritionData; label: string }> = [
    { key: "protein", label: "Protein" },
    { key: "fats", label: "Total Fat" },
    { key: "carbs", label: "Carbohydrates" },
    { key: "sugar", label: "Sugar" },
    { key: "fiber", label: "Dietary Fiber" },
  ];

  for (const { key, label } of macroChecks) {
    const item = data[key] as { value: number; unit: string } | null;
    if (item && item.unit === "g" && item.value > 100) {
      const msg = `${label} (${item.value}g) exceeds 100g per serving`;
      flags[key] = msg;
      warnings.push(`${label} is parsed as ${item.value}g per serving, which exceeds 100g.`);
    }
  }

  // 3. Implausible per-serving calories
  if (data.calories) {
    const cal = data.calories.value;
    if (cal > 1500) {
      flags.calories = `Calories (${cal} kcal) appear unusually high for a single serving`;
      warnings.push(`Calories are parsed as ${cal} kcal, which appears unusually high for a single serving.`);
    } else if (cal < 0) {
      flags.calories = `Negative calorie value (${cal} kcal)`;
      warnings.push(`Calorie count cannot be negative (${cal} kcal).`);
    }
  }

  // 4. Implausible sodium (e.g. > 10,000mg / 10g in a single serving)
  if (data.sodium) {
    const sod = data.sodium.value;
    const mg = data.sodium.unit === "g" ? sod * 1000 : sod;
    if (mg > 10000) {
      flags.sodium = `Sodium (${mg}mg) is unusually high for a single serving`;
      warnings.push(`Sodium is parsed as ${mg}mg per serving, which may be an OCR misread.`);
    }
  }

  // 5. Total macros sum vs parsed serving weight in grams
  if (data.servingSize && data.fats && data.carbs && data.protein) {
    const match = data.servingSize.match(/(\d+(?:\.\d+)?)\s*g\b/i);
    if (match) {
      const servingGrams = parseFloat(match[1]);
      const macroSum = data.fats.value + data.carbs.value + data.protein.value;
      // Allow 20% tolerance for rounding/water weight
      if (servingGrams > 0 && macroSum > servingGrams * 1.25 && macroSum > 10) {
        const msg = `Sum of macros (${macroSum.toFixed(1)}g) exceeds serving size (${servingGrams}g)`;
        if (!flags.carbs) flags.carbs = msg;
        if (!flags.fats) flags.fats = msg;
        if (!flags.protein) flags.protein = msg;
        warnings.push(`The sum of macros (${macroSum.toFixed(1)}g) is substantially greater than the stated serving size of ${servingGrams}g.`);
      }
    }
  }

  return {
    flags,
    warnings,
    hasIssues: Object.keys(flags).length > 0,
  };
}
