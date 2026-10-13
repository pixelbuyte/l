# Spanish Vocabulary Recognition App

Standalone Spanish-to-English vocabulary app powered by Claude's multimodal AI.
Upload a screenshot or photo of Spanish text, or type directly—the app translates
it and finds the correct answer among multiple-choice options.

## Features

- **Translate text** — instant Spanish → English translation with part-of-speech info
- **Image analysis** — extract and translate Spanish words from photos or screenshots
- **Multiple-choice matching** — add answer choices to identify the correct translation,
  complete with the matching choice's text, confidence level, and screen position
- **Visual position map** — when analyzing an image with choices, shows approximate
  locations and background colors of each option in the image
- **Dark mode** — follows system preference; toggle manually in the header
- **Clear quality feedback** — flags blurry or unreadable images before wasting a call

## Setup

### 1. Prerequisites

- Node.js 18+
- An Anthropic API key — get one at <https://console.anthropic.com>

### 2. Install dependencies

```sh
cd vocab
npm install
```

### 3. Configure environment

```sh
cp .env.example .env
# Edit .env and set ANTHROPIC_API_KEY=sk-ant-...
```

Optional settings in `.env`:

| Variable | Default | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | *(required)* | Your Anthropic API key |
| `CLAUDE_MODEL` | `claude-opus-5-5` | Model to use. Try `claude-haiku-5-5` for lower latency |
| `PORT` | `3000` | HTTP port |

### 4. Start the server

```sh
npm start
# → http://localhost:3000
```

For development with auto-reload:

```sh
npm run dev
```

## Usage

### Translate text

1. Open the **Translate text** tab
2. Type or paste a Spanish word, phrase, or sentence
3. Optionally add answer choices (for classroom quiz-style matching)
4. Click **Translate**

### Analyze an image

1. Open the **Analyze image** tab
2. Drop a screenshot or photo, or click to browse
3. Optionally add answer choices to match against
4. Click **Analyze image**

When choices are provided and the image is analyzed, the result shows:
- The Spanish text extracted from the image
- The English translation
- Which choice matches, with confidence (high / medium / low)
- A visual position map showing each choice's approximate location and color in the image

### Handling blurry images

If Claude cannot read the image text (due to blur, low resolution, or camera angle),
the response returns `image_quality: "unreadable"` with a short explanation.
The app shows a `⚠` status and does not display a false translation.

## API reference

### `POST /api/translate`

**Body (JSON):**
```json
{
  "text": "hablar",
  "choices": [
    { "id": "a", "text": "to run" },
    { "id": "b", "text": "to speak" }
  ]
}
```
`choices` is optional. When omitted, returns a plain translation.

**Response:**
```json
{
  "success": true,
  "translation": "to speak",
  "part_of_speech": "verb",
  "notes": "common irregular verb",
  "match": {
    "index": 1,
    "text": "to speak",
    "confidence": "high"
  }
}
```

### `POST /api/analyze-image`

**Multipart form data:**
- `image` — JPEG, PNG, GIF, or WebP; max 10 MB
- `choices` — JSON string (same shape as above), optional

**Response (with choices):**
```json
{
  "success": true,
  "extracted_text": "gato",
  "translation": "cat",
  "image_quality": "clear",
  "match": { "index": 0, "text": "cat", "confidence": "high" },
  "visual_choices": [
    {
      "index": 0,
      "text": "cat",
      "position": { "region": "top-left", "x_percent": 25, "y_percent": 20 },
      "background_color": "#4CAF50",
      "text_color": "#ffffff",
      "is_correct": true
    }
  ]
}
```

**Response (no choices — OCR mode):**
```json
{
  "success": true,
  "extracted_text": "gato perro casa",
  "items": [
    { "spanish": "gato", "english": "cat", "type": "word" },
    { "spanish": "perro", "english": "dog", "type": "word" },
    { "spanish": "casa", "english": "house", "type": "word" }
  ],
  "image_quality": "clear",
  "notes": "Flashcard with three nouns"
}
```

### `GET /api/health`

Returns `{ "status": "ok", "model": "..." }`.

## Tests

```sh
npm test
```

Runs 14 unit/integration tests with a stubbed Anthropic client—no API key needed.
Tests cover translation, choice matching, image analysis, error cases, and MIME-type
validation.

## Notes

- No browser automation or third-party game interaction is performed.
- The app never auto-clicks, reads clipboard data, or interacts with other windows.
- Images are processed in memory and never written to disk.
