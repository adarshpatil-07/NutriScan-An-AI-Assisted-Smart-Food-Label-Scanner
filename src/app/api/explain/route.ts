import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, Type } from "@google/genai";
import { ParsedNutritionData } from "@/lib/parseNutrition";
import { ParsedIngredientsData } from "@/lib/parseIngredients";
import { NutritionTag } from "@/lib/nutritionSummary";
import { DietaryProfile, hasActiveProfile } from "@/lib/storage";

interface ExplainRequestBody {
  nutrition?: ParsedNutritionData;
  ingredientsData?: ParsedIngredientsData;
  summaryTags?: NutritionTag[];
  language?: string;
  dietaryProfile?: DietaryProfile;
  sanityWarnings?: string[];
}

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.6-flash";

const systemPrompt = `You are a nutrition explanation assistant for a food label explainer tool.
Your goal is to provide honest, plain-language explanations of food labels for everyday consumers.
Guidelines:
- Explain the nutrition profile in plain, accessible language (assume a general audience, not a nutritionist).
- Briefly note anything notable about the ingredients if relevant (e.g. whole food bases vs refined ingredients, additives, sweeteners, sodium sources, allergens) without being alarmist or making medical claims.
- If the user has provided a dietary profile, address how this food relates to their profile where relevant (e.g. "for someone watching sodium, this is notable because…"), keep it plain and concise, and do NOT give medical advice or clinical diagnoses.
- If any OCR sanity cautions are provided, briefly note that those specific numbers may be unreliable OCR misreads and encourage checking the label.
- Give a short overall takeaway (2-4 sentences max for the takeaway).
- Avoid generic filler phrases like "As an AI", "It's important to note", or "In summary" — write directly and concisely.
- If a target language is specified, write the explanation and takeaway clearly in that language.
- Return ONLY valid JSON matching {"explanation": string, "takeaway": string}. Do not wrap in markdown or backticks.`;

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    explanation: {
      type: Type.STRING,
      description:
        "A direct, plain-language explanation of this food's nutritional profile and ingredients. Highlight what stands out (e.g. macronutrient balance, notable ingredients, processing level, sodium/sugar density, and fit with user's dietary profile if provided) without making alarmist statements or medical diagnoses. Write as a knowledgeable guide.",
    },
    takeaway: {
      type: Type.STRING,
      description:
        "A 2 to 4 sentence overall takeaway summarizing what this food is best suited for, and what to keep in mind when eating it.",
    },
  },
  required: ["explanation", "takeaway"],
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ExplainRequestBody;
    const { nutrition, ingredientsData, summaryTags, language, dietaryProfile, sanityWarnings } = body;

    if (!nutrition && !ingredientsData) {
      return NextResponse.json(
        { error: "Invalid request payload. Nutrition or ingredients data required." },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (
      !apiKey ||
      apiKey.trim() === "" ||
      apiKey === "your_actual_key_here" ||
      apiKey === "your_gemini_api_key_here"
    ) {
      return NextResponse.json(
        {
          error: "API_KEY_MISSING",
          message:
            "Gemini API key is not configured. Add GEMINI_API_KEY to your .env.local file to enable live AI explanations.",
        },
        { status: 503 }
      );
    }

    // Format prompt content from parsed label data
    const nutrientSummary = [
      nutrition?.calories ? `Calories: ${nutrition.calories.value} ${nutrition.calories.unit}` : null,
      nutrition?.fats ? `Total Fat: ${nutrition.fats.value}${nutrition.fats.unit}` : null,
      nutrition?.carbs ? `Total Carbohydrates: ${nutrition.carbs.value}${nutrition.carbs.unit}` : null,
      nutrition?.sugar ? `Sugars: ${nutrition.sugar.value}${nutrition.sugar.unit}` : null,
      nutrition?.fiber ? `Dietary Fiber: ${nutrition.fiber.value}${nutrition.fiber.unit}` : null,
      nutrition?.protein ? `Protein: ${nutrition.protein.value}${nutrition.protein.unit}` : null,
      nutrition?.sodium ? `Sodium: ${nutrition.sodium.value}${nutrition.sodium.unit}` : null,
      nutrition?.servingSize ? `Serving Size: ${nutrition.servingSize}` : null,
    ]
      .filter(Boolean)
      .join(", ");

    const ingredientsList =
      ingredientsData?.ingredients && ingredientsData.ingredients.length > 0
        ? ingredientsData.ingredients.join(", ")
        : "Not detected or not listed";

    const allergensList =
      ingredientsData?.containsAllergens && ingredientsData.containsAllergens.length > 0
        ? ingredientsData.containsAllergens.join(", ")
        : "None specifically declared";

    const tagsList =
      summaryTags && summaryTags.length > 0
        ? summaryTags.map((t) => `${t.label} (${t.detail})`).join("; ")
        : "None";

    // Format user profile section ONLY if set
    let profileSection = "";
    if (hasActiveProfile(dietaryProfile)) {
      const activeConditions: string[] = [];
      if (dietaryProfile?.conditions?.diabetic) activeConditions.push("Diabetic / watching sugar");
      if (dietaryProfile?.conditions?.bloodPressure) activeConditions.push("High blood pressure / watching sodium");
      if (dietaryProfile?.conditions?.cholesterol) activeConditions.push("Watching cholesterol / fat");

      const profileLines: string[] = [];
      if (activeConditions.length > 0) {
        profileLines.push(`- Conditions: ${activeConditions.join(", ")}`);
      }
      if (dietaryProfile?.allergens && dietaryProfile.allergens.length > 0) {
        profileLines.push(`- Allergens to avoid: ${dietaryProfile.allergens.join(", ")}`);
      }
      if (dietaryProfile?.dietType && dietaryProfile.dietType !== "none") {
        profileLines.push(`- Diet type: ${dietaryProfile.dietType}`);
      }

      if (profileLines.length > 0) {
        profileSection = `\nUSER DIETARY PROFILE (Address where relevant, without giving medical advice):\n${profileLines.join("\n")}\n`;
      }
    }

    // Format sanity cautions section ONLY if present
    let cautionsSection = "";
    if (sanityWarnings && sanityWarnings.length > 0) {
      cautionsSection = `\nPOTENTIAL OCR MISREAD CAUTIONS:\n${sanityWarnings.map((w) => `- ${w}`).join("\n")}\n(Mention that these numbers may be OCR misreads so the consumer should verify with the package.)\n`;
    }

    const languageInstruction =
      language === "hi"
        ? "Write the explanation and takeaway in Hindi (हिन्दी)."
        : language === "mr"
        ? "Write the explanation and takeaway in Marathi (मराठी)."
        : "Write the explanation and takeaway in English.";

    const promptText = `Please analyze this packaged food label:

NUTRITION PROFILE:
${nutrientSummary || "No core nutrition metrics detected"}

INGREDIENTS:
${ingredientsList}

ALLERGENS:
${allergensList}

RULE-BASED SUMMARY HIGHLIGHTS:
${tagsList}
${profileSection}${cautionsSection}
LANGUAGE REQUIREMENT:
${languageInstruction}

Respond strictly with a JSON object containing "explanation" and "takeaway" fields.`;

    const ai = new GoogleGenAI({ apiKey });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    try {
      const result = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: [{ role: "user", parts: [{ text: promptText }] }],
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: "application/json",
          responseSchema,
        },
      });

      clearTimeout(timeoutId);

      const rawText = result.text ?? "";

      // Parse JSON response safely
      let parsedResponse: { explanation: string; takeaway: string };
      try {
        const cleanedText = rawText
          .replace(/^```(?:json)?\s*/i, "")
          .replace(/\s*```$/, "")
          .trim();
        parsedResponse = JSON.parse(cleanedText);
      } catch {
        // Fallback if model returned plain text rather than strict JSON
        parsedResponse = {
          explanation: rawText.trim(),
          takeaway: "Review the nutrition table and ingredients above to make an informed choice.",
        };
      }

      return NextResponse.json({
        explanation: parsedResponse.explanation || "No explanation text generated.",
        takeaway: parsedResponse.takeaway || "",
      });
    } catch (genErr: any) {
      clearTimeout(timeoutId);

      if (genErr?.name === "AbortError") {
        return NextResponse.json(
          {
            error: "TIMEOUT",
            message: "Explanation generation timed out after 20 seconds. Please try again.",
          },
          { status: 504 }
        );
      }

      console.error("Gemini API error:", genErr);

      const errMessage: string =
        genErr?.message || "Gemini API error. Explanation unavailable right now.";
      const status = errMessage.includes("404") ? 502 : 502;
      return NextResponse.json(
        { error: "API_ERROR", message: errMessage },
        { status }
      );
    }
  } catch (err: any) {
    console.error("Unhandled error in /api/explain:", err);
    return NextResponse.json(
      {
        error: "INTERNAL_ERROR",
        message: err?.message || "Failed to generate explanation due to an internal server error.",
      },
      { status: 500 }
    );
  }
}
