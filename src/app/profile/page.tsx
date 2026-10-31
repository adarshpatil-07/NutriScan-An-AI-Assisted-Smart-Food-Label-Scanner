"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Check,
  RotateCcw,
  ShieldCheck,
  AlertCircle,
  ArrowRight,
} from "lucide-react";
import {
  getDietaryProfile,
  saveDietaryProfile,
  resetDietaryProfile,
  DietaryProfile,
  DietType,
  DEFAULT_DIETARY_PROFILE,
} from "@/lib/storage";

const ALLERGEN_OPTIONS: Array<{ key: string; label: string; detail: string }> = [
  { key: "peanuts", label: "Peanuts", detail: "Groundnuts, arachis oil, moongphali" },
  { key: "tree nuts", label: "Tree Nuts", detail: "Almonds, cashews, walnuts, pistachios, badam, kaju" },
  { key: "milk", label: "Milk / Dairy", detail: "Butter, ghee, cheese, whey, curd, paneer, mawa" },
  { key: "eggs", label: "Eggs", detail: "Albumen, egg yolk, mayonnaise, powdered egg" },
  { key: "soy", label: "Soy", detail: "Soybean, tofu, edamame, soy lecithin" },
  { key: "wheat/gluten", label: "Wheat / Gluten", detail: "Atta, maida, suji, rava, semolina, spelt, barley" },
  { key: "fish", label: "Fish", detail: "Tuna, salmon, cod, anchovies, fish sauce" },
  { key: "shellfish", label: "Shellfish", detail: "Prawns, shrimp, crab, lobster, oysters, clams" },
  { key: "sesame", label: "Sesame", detail: "Sesame seeds, til, tahini, gingelly" },
];

export default function ProfilePage() {
  const [profile, setProfile] = useState<DietaryProfile>(DEFAULT_DIETARY_PROFILE);
  const [isLoaded, setIsLoaded] = useState(false);
  const [showSavedFeedback, setShowSavedFeedback] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  useEffect(() => {
    const loaded = getDietaryProfile();
    setProfile(loaded);
    setIsLoaded(true);
  }, []);

  const updateProfile = (updater: (prev: DietaryProfile) => DietaryProfile) => {
    setProfile((prev) => {
      const next = updater(prev);
      saveDietaryProfile(next);
      setShowSavedFeedback(true);
      setTimeout(() => setShowSavedFeedback(false), 1500);
      return next;
    });
  };

  const handleConditionChange = (condition: keyof DietaryProfile["conditions"]) => {
    updateProfile((prev) => ({
      ...prev,
      conditions: {
        ...prev.conditions,
        [condition]: !prev.conditions[condition],
      },
    }));
  };

  const handleAllergenToggle = (key: string) => {
    updateProfile((prev) => {
      const exists = prev.allergens.includes(key);
      const allergens = exists
        ? prev.allergens.filter((a) => a !== key)
        : [...prev.allergens, key];
      return { ...prev, allergens };
    });
  };

  const handleDietTypeChange = (dietType: DietType) => {
    updateProfile((prev) => ({ ...prev, dietType }));
  };

  const handleReset = () => {
    const reset = resetDietaryProfile();
    setProfile(reset);
    setShowResetConfirm(false);
    setShowSavedFeedback(true);
    setTimeout(() => setShowSavedFeedback(false), 1500);
  };

  if (!isLoaded) {
    return (
      <div className="py-12 text-center text-xs text-secondary">
        Loading profile settings…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header & Context Note */}
      <div className="pb-4 border-b border-subtle flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-lg font-bold text-primary tracking-tight">
            Dietary Profile
          </h1>
          <p className="text-xs text-secondary max-w-xl leading-relaxed">
            Configure your dietary conditions, allergens, and dietary preferences. Your
            nutrition flags, ingredient warnings, and AI explanations will adjust automatically.
          </p>
        </div>

        {/* Action & Saved status badge */}
        <div className="flex items-center gap-3">
          {showSavedFeedback && (
            <span
              role="status"
              className="text-xs font-medium text-accent inline-flex items-center gap-1 transition-opacity animate-in fade-in"
            >
              <Check className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Saved</span>
            </span>
          )}

          {!showResetConfirm ? (
            <button
              type="button"
              onClick={() => setShowResetConfirm(true)}
              className="text-xs text-secondary hover:text-primary transition-colors inline-flex items-center gap-1.5 py-1.5 px-2.5 border border-subtle rounded bg-surface hover:bg-subtle focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
            >
              <RotateCcw className="w-3 h-3" aria-hidden="true" />
              <span>Reset profile</span>
            </button>
          ) : (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-secondary text-[11px]">Confirm reset?</span>
              <button
                type="button"
                onClick={handleReset}
                className="px-2 py-1 bg-amber-700 hover:bg-amber-800 text-white font-medium rounded text-[11px] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-700"
              >
                Yes, Reset
              </button>
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="px-2 py-1 bg-surface border border-subtle text-secondary hover:text-primary rounded text-[11px] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Local-only Privacy Notice */}
      <div className="border border-subtle bg-surface rounded-md p-3.5 text-xs text-secondary flex items-start gap-2.5">
        <ShieldCheck className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" aria-hidden="true" />
        <p className="leading-relaxed">
          <span className="font-medium text-primary">Private & Local:</span> This profile is saved
          exclusively in your browser&apos;s local storage. It is never stored on a server or shared.
        </p>
      </div>

      {/* Section 1: Dietary Conditions */}
      <div className="bg-surface border border-subtle rounded-md p-5 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-primary">
            Health & Dietary Conditions
          </h2>
          <p className="text-xs text-secondary mt-0.5">
            Activates stricter rule-based thresholds and profile-specific caution tags.
          </p>
        </div>

        <div className="space-y-3 pt-2">
          {/* Diabetic */}
          <label className="flex items-start gap-3 p-3 border border-subtle rounded bg-background hover:border-secondary/40 cursor-pointer transition-colors">
            <input
              type="checkbox"
              id="condition-diabetic"
              checked={profile.conditions.diabetic}
              onChange={() => handleConditionChange("diabetic")}
              className="mt-0.5 w-4 h-4 rounded border-subtle text-accent focus:ring-accent accent-accent"
            />
            <div className="space-y-0.5">
              <span className="text-xs font-semibold text-primary block">
                Diabetic / watching sugar
              </span>
              <span className="text-[11px] text-secondary block leading-relaxed">
                Applies a stricter sugar threshold (flags sugar at ≥ 5g per serving instead of
                12g) and adds &ldquo;High sugar for your profile&rdquo; warnings.
              </span>
            </div>
          </label>

          {/* Blood Pressure */}
          <label className="flex items-start gap-3 p-3 border border-subtle rounded bg-background hover:border-secondary/40 cursor-pointer transition-colors">
            <input
              type="checkbox"
              id="condition-bp"
              checked={profile.conditions.bloodPressure}
              onChange={() => handleConditionChange("bloodPressure")}
              className="mt-0.5 w-4 h-4 rounded border-subtle text-accent focus:ring-accent accent-accent"
            />
            <div className="space-y-0.5">
              <span className="text-xs font-semibold text-primary block">
                High blood pressure / watching sodium
              </span>
              <span className="text-[11px] text-secondary block leading-relaxed">
                Applies a stricter sodium threshold (flags sodium at ≥ 200mg per serving instead of
                400mg) and adds &ldquo;High sodium for your profile&rdquo; warnings.
              </span>
            </div>
          </label>

          {/* Cholesterol */}
          <label className="flex items-start gap-3 p-3 border border-subtle rounded bg-background hover:border-secondary/40 cursor-pointer transition-colors">
            <input
              type="checkbox"
              id="condition-cholesterol"
              checked={profile.conditions.cholesterol}
              onChange={() => handleConditionChange("cholesterol")}
              className="mt-0.5 w-4 h-4 rounded border-subtle text-accent focus:ring-accent accent-accent"
            />
            <div className="space-y-0.5">
              <span className="text-xs font-semibold text-primary block">
                Watching cholesterol / fat
              </span>
              <span className="text-[11px] text-secondary block leading-relaxed">
                Applies a stricter total fat threshold (flags total fat at ≥ 8g per serving instead of
                15g) and adds &ldquo;High fat for your profile&rdquo; warnings.
              </span>
            </div>
          </label>
        </div>
      </div>

      {/* Section 2: Allergens */}
      <div className="bg-surface border border-subtle rounded-md p-5 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-primary">Allergens to Avoid</h2>
          <p className="text-xs text-secondary mt-0.5">
            Ingredients are scanned against standard derivatives and Indian ingredient names
            (e.g., maida, ghee, badam, kaju). Matches are flagged prominently in ingredients.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-2">
          {ALLERGEN_OPTIONS.map((item) => {
            const isChecked = profile.allergens.includes(item.key);

            return (
              <label
                key={item.key}
                className={`flex items-start gap-2.5 p-3 border rounded cursor-pointer transition-colors ${
                  isChecked
                    ? "bg-accent-light/50 dark:bg-accent/10 border-accent/40"
                    : "bg-background border-subtle hover:border-secondary/40"
                }`}
              >
                <input
                  type="checkbox"
                  id={`allergen-${item.key.replace(/\s+/g, "-")}`}
                  checked={isChecked}
                  onChange={() => handleAllergenToggle(item.key)}
                  className="mt-0.5 w-4 h-4 rounded border-subtle text-accent focus:ring-accent accent-accent"
                />
                <div className="space-y-0.5 min-w-0">
                  <span className="text-xs font-medium text-primary block">
                    {item.label}
                  </span>
                  <span className="text-[10px] text-secondary block truncate" title={item.detail}>
                    {item.detail}
                  </span>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      {/* Section 3: Diet Type */}
      <div className="bg-surface border border-subtle rounded-md p-5 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-primary">Diet Type</h2>
          <p className="text-xs text-secondary mt-0.5">
            Flags animal-derived ingredients, hidden animal enzymes, gelatin, or dairy in the
            ingredient list.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          {/* None */}
          <label
            className={`p-3.5 border rounded cursor-pointer transition-colors flex items-start gap-2.5 ${
              profile.dietType === "none"
                ? "bg-accent-light/50 dark:bg-accent/10 border-accent/40"
                : "bg-background border-subtle hover:border-secondary/40"
            }`}
          >
            <input
              type="radio"
              name="dietType"
              value="none"
              checked={profile.dietType === "none"}
              onChange={() => handleDietTypeChange("none")}
              className="mt-0.5 w-4 h-4 text-accent focus:ring-accent accent-accent"
            />
            <div>
              <span className="text-xs font-semibold text-primary block">None</span>
              <span className="text-[11px] text-secondary block mt-0.5">
                No general diet restriction
              </span>
            </div>
          </label>

          {/* Vegetarian */}
          <label
            className={`p-3.5 border rounded cursor-pointer transition-colors flex items-start gap-2.5 ${
              profile.dietType === "vegetarian"
                ? "bg-accent-light/50 dark:bg-accent/10 border-accent/40"
                : "bg-background border-subtle hover:border-secondary/40"
            }`}
          >
            <input
              type="radio"
              name="dietType"
              value="vegetarian"
              checked={profile.dietType === "vegetarian"}
              onChange={() => handleDietTypeChange("vegetarian")}
              className="mt-0.5 w-4 h-4 text-accent focus:ring-accent accent-accent"
            />
            <div>
              <span className="text-xs font-semibold text-primary block">Vegetarian</span>
              <span className="text-[11px] text-secondary block mt-0.5">
                Flags meat, poultry, fish, gelatin, lard, and carmine
              </span>
            </div>
          </label>

          {/* Vegan */}
          <label
            className={`p-3.5 border rounded cursor-pointer transition-colors flex items-start gap-2.5 ${
              profile.dietType === "vegan"
                ? "bg-accent-light/50 dark:bg-accent/10 border-accent/40"
                : "bg-background border-subtle hover:border-secondary/40"
            }`}
          >
            <input
              type="radio"
              name="dietType"
              value="vegan"
              checked={profile.dietType === "vegan"}
              onChange={() => handleDietTypeChange("vegan")}
              className="mt-0.5 w-4 h-4 text-accent focus:ring-accent accent-accent"
            />
            <div>
              <span className="text-xs font-semibold text-primary block">Vegan</span>
              <span className="text-[11px] text-secondary block mt-0.5">
                Flags all animal items including dairy, honey, and eggs
              </span>
            </div>
          </label>
        </div>
      </div>

      {/* Navigation link to Scan */}
      <div className="pt-2 flex justify-end">
        <Link
          href="/"
          className="text-xs font-medium text-white bg-accent hover:bg-accent-hover transition-colors inline-flex items-center gap-1.5 py-2 px-3.5 rounded focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
        >
          <span>Ready to scan labels</span>
          <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
