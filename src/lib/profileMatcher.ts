import { DietaryProfile } from "./storage";

export interface AllergenMatch {
  allergenKey: string;
  allergenLabel: string;
  matchedKeywords: string[];
  foundInIngredients: string[];
}

export interface DietMatch {
  dietType: "vegetarian" | "vegan";
  reason: string;
  matchedKeywords: string[];
  foundInIngredients: string[];
}

export interface ProfileMatchResult {
  allergenMatches: AllergenMatch[];
  dietMatches: DietMatch[];
  hasConflicts: boolean;
}

// Canonical Allergen Keywords dictionary (including Indian names & derivatives)
export const ALLERGEN_KEYWORDS_MAP: Record<string, { label: string; keywords: string[] }> = {
  peanuts: {
    label: "Peanuts",
    keywords: [
      "peanut",
      "peanuts",
      "groundnut",
      "groundnuts",
      "arachis",
      "moongphali",
      "mungphali",
      "singdana",
      "peanut butter",
      "peanut oil",
    ],
  },
  "tree nuts": {
    label: "Tree Nuts",
    keywords: [
      "tree nut",
      "tree nuts",
      "almond",
      "almonds",
      "badam",
      "cashew",
      "cashews",
      "kaju",
      "walnut",
      "walnuts",
      "akhrot",
      "pistachio",
      "pistachios",
      "pista",
      "hazelnut",
      "hazelnuts",
      "pecan",
      "pecans",
      "macadamia",
      "brazil nut",
      "brazil nuts",
      "pine nut",
      "pine nuts",
      "chilgoza",
      "praline",
    ],
  },
  milk: {
    label: "Milk / Dairy",
    keywords: [
      "milk",
      "whey",
      "casein",
      "caseinate",
      "butter",
      "ghee",
      "cream",
      "lactose",
      "curd",
      "dahi",
      "paneer",
      "cheese",
      "dairy",
      "mawa",
      "khoya",
      "malai",
      "buttermilk",
      "chaas",
      "shrikhand",
      "milk solid",
      "milk solids",
      "milk powder",
      "skimmed milk",
      "whole milk",
      "condensed milk",
    ],
  },
  eggs: {
    label: "Eggs",
    keywords: [
      "egg",
      "eggs",
      "egg white",
      "egg whites",
      "egg yolk",
      "egg yolks",
      "albumen",
      "albumin",
      "ovalbumin",
      "lysozyme",
      "mayonnaise",
      "anda",
      "powdered egg",
    ],
  },
  soy: {
    label: "Soy",
    keywords: [
      "soy",
      "soya",
      "soybean",
      "soybeans",
      "soyabean",
      "soyabeans",
      "tofu",
      "edamame",
      "soy lecithin",
      "soya lecithin",
      "tamari",
      "miso",
      "tempeh",
      "soy protein",
      "soya chunks",
    ],
  },
  "wheat/gluten": {
    label: "Wheat / Gluten",
    keywords: [
      "wheat",
      "flour",
      "maida",
      "atta",
      "gluten",
      "semolina",
      "suji",
      "sooji",
      "rava",
      "spelt",
      "barley",
      "rye",
      "malt",
      "durum",
      "graham",
      "daliya",
      "wheat germ",
      "wheat bran",
      "wheat gluten",
    ],
  },
  fish: {
    label: "Fish",
    keywords: [
      "fish",
      "tuna",
      "salmon",
      "cod",
      "anchovy",
      "anchovies",
      "sardine",
      "sardines",
      "mackerel",
      "tilapia",
      "surimi",
      "fish sauce",
      "fish oil",
      "machhli",
      "gelatin",
    ],
  },
  shellfish: {
    label: "Shellfish",
    keywords: [
      "shellfish",
      "shrimp",
      "shrimps",
      "prawn",
      "prawns",
      "crab",
      "crabs",
      "lobster",
      "lobsters",
      "crawfish",
      "crayfish",
      "oyster",
      "oysters",
      "mussel",
      "mussels",
      "clam",
      "clams",
      "scallop",
      "scallops",
      "jheenga",
      "krill",
    ],
  },
  sesame: {
    label: "Sesame",
    keywords: [
      "sesame",
      "sesame seed",
      "sesame seeds",
      "til",
      "tahini",
      "gingelly",
      "sesamum",
    ],
  },
};

const NON_VEGETARIAN_KEYWORDS = [
  "gelatin",
  "gelatine",
  "rennet",
  "carmine",
  "cochineal",
  "lard",
  "tallow",
  "chicken",
  "poultry",
  "beef",
  "pork",
  "bacon",
  "mutton",
  "lamb",
  "meat",
  "fish",
  "anchovy",
  "anchovies",
  "shellfish",
  "prawn",
  "prawns",
  "shrimp",
  "shrimps",
  "oyster",
  "crab",
  "lobster",
];

const ANIMAL_DERIVED_KEYWORDS = [
  ...NON_VEGETARIAN_KEYWORDS,
  "milk",
  "whey",
  "casein",
  "caseinate",
  "butter",
  "ghee",
  "cream",
  "lactose",
  "curd",
  "dahi",
  "paneer",
  "cheese",
  "dairy",
  "mawa",
  "khoya",
  "malai",
  "buttermilk",
  "milk solid",
  "milk solids",
  "milk powder",
  "egg",
  "eggs",
  "albumen",
  "albumin",
  "honey",
  "beeswax",
];

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function matchesKeyword(text: string, keyword: string): boolean {
  const pattern = `(?:^|[^a-zA-Z0-9])${escapeRegex(keyword)}(?:$|[^a-zA-Z0-9])`;
  const regex = new RegExp(pattern, "i");
  return regex.test(text);
}

/**
 * Scans an ingredient list and raw block against the user's dietary profile.
 */
export function matchProfileIngredients(
  ingredients: string[],
  rawBlock: string | null,
  profile: DietaryProfile | null | undefined
): ProfileMatchResult {
  const allergenMatches: AllergenMatch[] = [];
  const dietMatches: DietMatch[] = [];

  if (!profile || (!profile.allergens.length && profile.dietType === "none")) {
    return { allergenMatches, dietMatches, hasConflicts: false };
  }

  // Combined corpus of ingredients to search
  const allItems = [...ingredients];
  if (rawBlock && !allItems.includes(rawBlock)) {
    // include raw block lines if helpful
    const extra = rawBlock.split(/[\n,;]/).map((s) => s.trim()).filter(Boolean);
    for (const item of extra) {
      if (!allItems.includes(item)) {
        allItems.push(item);
      }
    }
  }

  // 1. Allergen Checking
  for (const allergenKey of profile.allergens) {
    const config =
      ALLERGEN_KEYWORDS_MAP[allergenKey.toLowerCase()] ||
      ALLERGEN_KEYWORDS_MAP[allergenKey.toLowerCase().replace(/\s+/g, "")];

    if (!config) continue;

    const matchedKws = new Set<string>();
    const foundIn = new Set<string>();

    for (const item of allItems) {
      for (const kw of config.keywords) {
        if (matchesKeyword(item, kw)) {
          matchedKws.add(kw);
          foundIn.add(item);
        }
      }
    }

    if (matchedKws.size > 0) {
      allergenMatches.push({
        allergenKey,
        allergenLabel: config.label,
        matchedKeywords: Array.from(matchedKws),
        foundInIngredients: Array.from(foundIn).slice(0, 3), // top 3 occurrences
      });
    }
  }

  // 2. Diet Type Checking
  if (profile.dietType === "vegetarian") {
    const matchedKws = new Set<string>();
    const foundIn = new Set<string>();

    for (const item of allItems) {
      for (const kw of NON_VEGETARIAN_KEYWORDS) {
        if (matchesKeyword(item, kw)) {
          matchedKws.add(kw);
          foundIn.add(item);
        }
      }
    }

    if (matchedKws.size > 0) {
      dietMatches.push({
        dietType: "vegetarian",
        reason: "Contains non-vegetarian ingredient(s)",
        matchedKeywords: Array.from(matchedKws),
        foundInIngredients: Array.from(foundIn).slice(0, 3),
      });
    }
  } else if (profile.dietType === "vegan") {
    const matchedKws = new Set<string>();
    const foundIn = new Set<string>();

    for (const item of allItems) {
      for (const kw of ANIMAL_DERIVED_KEYWORDS) {
        if (matchesKeyword(item, kw)) {
          matchedKws.add(kw);
          foundIn.add(item);
        }
      }
    }

    if (matchedKws.size > 0) {
      dietMatches.push({
        dietType: "vegan",
        reason: "Contains animal-derived ingredient(s) (not vegan)",
        matchedKeywords: Array.from(matchedKws),
        foundInIngredients: Array.from(foundIn).slice(0, 3),
      });
    }
  }

  return {
    allergenMatches,
    dietMatches,
    hasConflicts: allergenMatches.length > 0 || dietMatches.length > 0,
  };
}
