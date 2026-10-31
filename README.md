# NutriScan : An AI-Assisted Smart Food Label Scanner

NutriScan is a client-first web application designed to help consumers decode packaged food labels. It combines browser-based image preprocessing and Optical Character Recognition (OCR) with deterministic nutrition parsing, customizable dietary profiles, local scan history with trend analytics, and Google's Gemini Flash model to deliver honest, plain-language explanations of nutritional values, ingredients, and allergen declarations.

---

## What the Application Does

Many consumers find nutrition fact tables and lengthy ingredient statements on food packaging confusing, misleading, or hard to read. NutriScan simplifies this process with a completely local-first, zero-database architecture:

1. **Captures or Uploads Labels**: Accepts packaged food photos via file upload, camera capture, drag-and-drop, or built-in sample presets.
2. **Optimizes Images Locally**: Applies adaptive scaling, grayscale conversion, and percentile-based contrast stretching using HTML5 Canvas before OCR.
3. **Extracts Text Client-Side**: Uses Tesseract.js in a dedicated browser Web Worker thread so sensitive image files never leave your device for OCR.
4. **Parses Metrics Deterministically**: Employs regex-driven parsers to extract core macronutrients, sodium, fiber, sugars, serving size, ingredients lists, and allergen declarations.
5. **Performs Sanity Validation Checks**: Flags implausible OCR numbers (e.g., sugar exceeding carbohydrates, macros over 100g/serving, extreme digit misreads) with clear warning indicators without silently altering extracted numbers.
6. **Applies Personalized Dietary Profiles**:
   - **Health Conditions**: Stricter thresholds for diabetic users ($\ge 5\text{g}$ sugar), high blood pressure ($\ge 200\text{mg}$ sodium), and cholesterol watchers ($\ge 8\text{g}$ fat), surfacing profile-specific tags like *"High sugar for your profile"*.
   - **Allergen & Diet Detection**: Scans ingredients against regional and international keywords (*maida, atta, ghee, kaju, badam, moongphali, etc.*) and visibly flags allergen and vegetarian/vegan diet conflicts.
7. **Generates Profile-Aware AI Explanations**: Sends structured data and active dietary preferences to a server-side Gemini Flash endpoint to produce an easy-to-understand breakdown, highlight dietary fit, and provide a short consumer takeaway without medical advice or diagnoses.
8. **Tracks Scans with Local History & Trend Charts**: Automatically saves up to 50 recent scans in `localStorage`. Includes a summary stats row, pure CSS/SVG bar charts for sugar and sodium trends over the last 10 scans, inline product renaming, and full result re-inspection.
9. **Supports Multiple Languages**: Provides full interface translation in English, Hindi, and Marathi while preserving exact numerical nutrition values.
10. **Offers Persistent Dark Mode**: Features a clean, low-contrast dark theme toggle with zero-flash rendering on reload.

---

## Architecture & Analysis Pipeline

```text
[ Food Packaging Image ]
           │
           ▼
[ HTML5 Canvas Preprocessing ]
   - Adaptive resolution scaling (300 DPI target)
   - Perceptual luminance grayscale conversion
   - 2nd–98th percentile histogram contrast stretching
           │
           ▼
[ Client-Side OCR Engine (Tesseract.js) ]
   - Runs in isolated browser Web Worker
   - Returns extracted text, line data & confidence score
           │
           ▼
[ Deterministic Parsers & Sanity Validation ]
   - parseNutrition.ts    -> Extract Calories, Fats, Carbs, Sugars, Fiber, Protein, Sodium
   - parseIngredients.ts  -> Extract ingredients list & package-declared allergens
   - validation.ts        -> Flag implausible values (sugar > carbs, macro > 100g, etc.)
           │
           ▼
[ Dietary Profile Matcher (Local Storage) ]
   - profileMatcher.ts    -> Scan ingredients for allergens (peanuts, tree nuts, milk, etc.) & diet conflicts
   - nutritionSummary.ts  -> Stricter thresholds for diabetic, hypertension, and cholesterol profiles
           │
           ▼
[ Local Storage History Layer (lib/storage.ts) ]
   - Auto-saves scan record (capped at 50, filters empty scans)
   - Powers /history dashboard, stats metrics, and SVG trend charts
           │
           ▼
[ Server-Side AI Layer (/api/explain) ]
   - Google Gemini 3.6 Flash via @google/genai
   - Schema-enforced JSON generation (explanation + takeaway)
   - Profile-aware & OCR-sanity-aware prompt guidance
           │
           ▼
[ UI Presentation (Scan / History / Profile) ]
   - Structured Nutrition Facts table with "Check this value" sanity badges
   - Ingredients list with prominent allergen & diet conflict alerts
   - Plain-language takeaway card
   - Collapsible raw OCR text inspection disclosure
```

---

## Key Features & Modules

### 1. Navigation & App Routes

The top navigation bar provides quick, accessible switching between the three main workspaces:

* **Scan** (`/`): The core live analysis pipeline (upload/camera, image preview, OCR execution, structured results table, and AI breakdown).
* **History** (`/history`): Personal scan dashboard featuring aggregated metrics, SVG trend charts, inline editable product names, and a full results viewer.
* **Profile** (`/profile`): Local dietary preferences manager for health conditions, allergen alerts, and diet types.

### 2. Dietary Profile & Personalization (`/profile`)

Users can customize their dietary constraints. All profile data is saved exclusively in the browser's `localStorage` and never transmitted to a server:

* **Health Conditions**:
  * **Diabetic / watching sugar**: Lowers the caution threshold to $\ge 5\text{g}$ sugar per serving and generates a *"High sugar for your profile"* badge.
  * **High blood pressure / watching sodium**: Lowers the sodium caution threshold to $\ge 200\text{mg}$ per serving.
  * **Watching cholesterol / fat**: Lowers the total fat caution threshold to $\ge 8\text{g}$ per serving.
* **Allergen Detection**: Scans parsed ingredient statements for 9 common allergen families: Peanuts, Tree Nuts, Milk/Dairy, Eggs, Soy, Wheat/Gluten, Fish, Shellfish, and Sesame.
  * Uses whole-word boundary regex matching to avoid false positives (e.g., *"butternut squash"* will not match *"butter"*).
  * Includes common regional and Indian ingredient terminology (*e.g., maida, atta, suji, rava, ghee, paneer, dahi, kaju, badam, moongphali, til*).
* **Diet Type**: Supports **None**, **Vegetarian** (flags animal flesh, poultry, fish, gelatin, lard, carmine), and **Vegan** (flags all animal-derived ingredients, including dairy, eggs, and honey).
* **Auto-Save & Reset**: Adjustments save instantly with a subtle confirmation indicator; includes a confirmation-guarded profile reset action.

### 3. Scan History & Dashboard (`/history`)

NutriScan preserves past scan results without requiring a backend database or user login:

* **Compact Stats Row**: Plain bordered metric cells summarizing:
  * Total Scans saved.
  * Average Sugar per serving across scans where sugar was detected.
  * Average Sodium per serving across scans where sodium was detected.
  * Count of scans containing one or more high caution flags.
* **Pure CSS/SVG Trend Bar Charts**: Understated, lightweight SVG bar charts showing per-serving sugar (g) and sodium (mg) trends across the last 10 scans with axis lines, values, and scan numbers. Zero third-party charting libraries.
* **Chronological List**: Displays saved scans (newest first) with timestamps, summary pills, and key nutrient previews.
* **Inline Product Renaming**: Click the pencil icon next to any product name to rename it inline (e.g., updating *"Unnamed product"* to *"Nature Crunch Granola"*).
* **Full Result Viewer**: Clicking **"View"** reopens the complete nutrition table, ingredients list, allergen alerts, and Gemini explanation using the identical `StructuredResultsView` component as the live scanner.
* **Management & Empty State**: Delete individual records, clear all history with a confirmation step, or tap the empty-state call-to-action to scan a new label.

### 4. Result Sanity Checks (`src/lib/validation.ts`)

OCR engines can occasionally misread numbers on wrinkled, curved, or reflective packaging. Rather than silently altering numbers, NutriScan performs automated sanity checks:

* **Sugar > Carbohydrates**: Flags cases where extracted sugar exceeds total carbohydrates.
* **Extreme Single-Serving Macros**: Flags any individual macronutrient (protein, carbs, fats, sugars, fiber) exceeding $100\text{g}$ per serving.
* **Unrealistic Calories**: Flags calorie counts $> 1500\text{ kcal}$ per serving or negative numbers.
* **Unrealistic Sodium**: Flags sodium values exceeding $10,000\text{mg}$ per serving.
* **Macro Sum vs. Serving Weight**: Checks if the sum of fats, carbs, and protein significantly exceeds the package's stated serving size in grams.
* **UI Indicator**: Displays a subtle `⚠️ Check this value` indicator beside the affected table row with a descriptive tooltip.
* **AI Awareness**: Cautions are included in the prompt to the Gemini API so the explanation explicitly advises the consumer to double-check those figures against the package.

---

## Image Processing & Computer Vision

Rather than bundling heavy external C++ or WASM-based computer vision frameworks (such as OpenCV), NutriScan uses a custom, zero-dependency browser Canvas implementation located in `src/lib/preprocess.ts`:

* **Adaptive Resolution Scaling**: Automatically rescales images so text height targets optimal OCR legibility (typically 1500px–2400px on the long edge).
* **Grayscale Conversion**: Calculates luminance using the standard ITU-R perceptual formula:
  $$\text{Luminance} = 0.299R + 0.587G + 0.114B$$
* **Histogram-Based Contrast Stretching**: Evaluates the pixel intensity distribution and clamps the 2nd and 98th percentiles to eliminate camera noise and glare before stretching the remaining dynamic range across [0, 255].
* **Tone Curve Sharpening**: Applies non-linear curve adjustments to enhance dark lettering against light packaging backgrounds.

Users can toggle between the original image and the contrast-enhanced OCR preview directly in the UI before initiating analysis.

---

## Gemini / AI Integration

* **Model Used**: `gemini-3.6-flash` (Google Gemini 3.x generation).
* **Role**: Translates raw numerical data and ingredient terms into accessible consumer takeaways. It does not guess nutrition values from scratch; it explains the verified data extracted by the deterministic parsers and addresses user dietary profile constraints where relevant.
* **Server-Side Security**: All Gemini interactions run strictly server-side in Next.js route handlers (`src/app/api/explain/route.ts`). The `GEMINI_API_KEY` is never exposed to the client or browser bundle.
* **Strict JSON Schema**: The API requests enforce strict structured outputs using `responseMimeType: "application/json"` and `responseSchema` defining `explanation` and `takeaway` string fields.
* **Offline & Missing Key Resilience**: If no Gemini API key is configured, the application continues to function normally for OCR extraction, tabular nutrition display, allergen detection, and highlight tags.

---

## Supported Languages

NutriScan includes a built-in internationalization (i18n) architecture supporting three languages:

* **English** (`en`)
* **Hindi** (`hi` - हिन्दी)
* **Marathi** (`mr` - मराठी)

### Key Features of the Translation System:
* **Complete Interface Translation**: Header navigation, upload instructions, file buttons, image previews, progress indicators, table headers, allergen warnings, profile tags, and error dialogs.
* **Numerical Value Preservation**: Nutrition numbers, units, and percentages (e.g., `230 kcal`, `8g`, `37g`, `160mg`, `10%`) are strictly preserved and never mistranslated.
* **Language-Aware AI Summaries**: Selected UI language is passed to `/api/explain` so the Gemini model generates takeaways directly in the chosen language.
* **Persistence**: The user's language selection is saved in `localStorage` (`food_label_language`) and restored across sessions.

---

## Dark Mode

* **Location**: Located in the top-right header alongside the language selector.
* **Minimalist Control**: Simple Sun/Moon toggle (`#theme-toggle-btn`) with accessible labels.
* **Developer-Focused Palette**: Clean, muted tones avoiding harsh neon gradients or glowing cards:
  * Light Mode: Warm off-white background (`#FAFAF9`), clean white surfaces (`#FFFFFF`), sage accent (`#3F6B4A`).
  * Dark Mode: Charcoal background (`#141413`), dark surface cards (`#1C1C1B`), subdued borders (`#2D2D2B`), muted forest green accent (`#528E62`).
* **Zero-Flash Hydration**: An inline script in `src/app/layout.tsx` checks `localStorage` and system preferences before rendering, preventing any light-mode flash on reload.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | [Next.js 14](https://nextjs.org/) (App Router, Server Components & Route Handlers) |
| **Language** | [TypeScript 5](https://www.typescriptlang.org/) |
| **UI Library** | [React 18](https://react.dev/) |
| **Styling** | [Tailwind CSS 3](https://tailwindcss.com/) with CSS Custom Properties |
| **OCR Engine** | [Tesseract.js 5](https://github.com/naptha/tesseract.js) (Browser Web Worker) |
| **Generative AI** | [@google/genai](https://www.npmjs.com/package/@google/genai) (`gemini-3.6-flash`) |
| **Data Persistence** | Browser `localStorage` (SSR-safe, zero database required) |
| **Charts** | Native CSS & inline SVG (zero chart dependencies) |
| **Icons** | [Lucide React](https://lucide.dev/) |
| **Linter** | ESLint with `eslint-config-next` |

---

## Project Structure

```text
food-label-explainer/
├── public/                       # Static assets
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── explain/
│   │   │       └── route.ts      # Profile-aware Gemini AI explanation endpoint
│   │   ├── history/
│   │   │   └── page.tsx          # Scan history dashboard, stats & SVG trend charts
│   │   ├── profile/
│   │   │   └── page.tsx          # Dietary conditions, allergens & diet preferences form
│   │   ├── globals.css           # CSS design tokens for light/dark themes
│   │   ├── layout.tsx            # Root layout, head script, navigation header
│   │   ├── page.tsx              # Main scanning interface & OCR workflow
│   │   └── providers.tsx         # Language context provider wrapper
│   ├── components/
│   │   ├── ErrorMessage.tsx      # Actionable photo recovery tips
│   │   ├── ExplanationView.tsx   # AI explanation & takeaway display
│   │   ├── Header.tsx            # Navigation bar (Scan, History, Profile) & controls
│   │   ├── ImagePreview.tsx      # Canvas image preview & contrast boost toggle
│   │   ├── LanguageSelector.tsx  # Language switcher (EN, HI, MR)
│   │   ├── OcrResultView.tsx     # Monospace raw OCR text disclosure
│   │   ├── OcrStatus.tsx         # Transparent worker progress indicator
│   │   ├── StructuredResultsView.tsx # Nutrition table, ingredients, flags & sanity notes
│   │   ├── ThemeToggle.tsx       # Sun/Moon theme toggle
│   │   └── UploadArea.tsx        # Drag-and-drop & camera capture zone
│   └── lib/
│       ├── i18n/
│       │   ├── LanguageContext.tsx # Translation hook & context
│       │   └── translations.ts   # Multilingual dictionaries (en, hi, mr)
│       ├── nutritionSummary.ts   # Rule-based highlight tags with profile threshold logic
│       ├── ocr.ts                # Tesseract.js worker initialization & execution
│       ├── parseIngredients.ts   # Ingredient extraction & regex splitting
│       ├── parseNutrition.ts     # Deterministic nutrient extraction & unit normalization
│       ├── preprocess.ts         # Canvas resolution scaling, grayscale & contrast
│       ├── profileMatcher.ts     # Allergen keyword & vegetarian/vegan diet matcher
│       ├── storage.ts            # Typed, SSR-safe localStorage layer (scans & profile)
│       └── validation.ts         # Sanity boundary checks for OCR numbers
├── .env.example                  # Environment variable template
├── .eslintrc.json                # ESLint configuration
├── next.config.mjs               # Next.js build configuration
├── package.json                  # Dependencies and scripts
├── tailwind.config.ts            # Tailwind styling tokens
└── tsconfig.json                 # TypeScript configuration
```

---

## Prerequisites

* **Node.js**: v18.17.0 or later (v20+ recommended).
* **Package Manager**: npm (bundled with Node.js), yarn, or pnpm.
* **Google Gemini API Key**: Obtain an API key from [Google AI Studio](https://aistudio.google.com/app/apikey) (optional for local OCR & parsing; required for live AI explanations).

---

## Installation & Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/food-label-explainer.git
   cd food-label-explainer
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment variables**:
   Copy `.env.example` to create your local `.env.local` file:
   ```bash
   cp .env.example .env.local
   ```

4. **Add your Gemini API key**:
   Open `.env.local` in your editor and insert your key:
   ```env
   # Food Label Explainer Environment Variables
   GEMINI_API_KEY=AIzaSy...your_actual_key_here
   GEMINI_MODEL=gemini-3.6-flash
   ```

---

## Running Locally

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

* Navigate to `/` to scan labels or test with sample granola / vegetable soup buttons.
* Navigate to `/profile` to set dietary conditions (diabetic, blood pressure, cholesterol, allergens, vegan/vegetarian).
* Navigate to `/history` to view your personal dashboard, stats, and trend charts.

---

## Building for Production

To create an optimized production build:

```bash
npm run build
```

To run the production build locally:

```bash
npm run start
```

To run code linting:

```bash
npm run lint
```

---

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `GEMINI_API_KEY` | Optional | *None* | Google AI Studio API key used by `/api/explain`. If omitted, OCR and parsing still work; AI explanation shows a configuration note. |
| `GEMINI_MODEL` | Optional | `gemini-3.6-flash` | Gemini model ID to use for explanations. |

> **Security Note**: Never commit `.env.local` or expose your `GEMINI_API_KEY` to source control. `.env.local` is included in `.gitignore` by default.

---

## Known Limitations

* **OCR Accuracy**: OCR performance depends on image sharpness, lighting, packaging curvature, and reflection. Highly reflective foils or severe glare can cause characters to be misread.
* **Label Layout Variability**: Non-standard nutrition formats (such as non-FDA tables or unformatted novelty layouts) may result in fewer detected metrics. The raw text disclosure is always available to verify unparsed content.
* **Cold Starts on First OCR Run**: On the very first scan, Tesseract.js fetches the English language traineddata asset (~4 MB). Subsequent scans use the browser cache and run significantly faster.
* **Offline AI Limitations**: Text extraction, deterministic nutrition parsing, sanity checking, and profile matching run entirely in your local browser without an internet connection. The AI explanation block requires network connectivity to reach the Google Gemini API.

---

## License

This project is licensed under the MIT License.
