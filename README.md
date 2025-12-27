<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/temp/1

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Run as an Electron app

1. Install dependencies: `npm install`
2. Set `GEMINI_API_KEY` in [.env.local](.env.local)
3. Start the desktop app in dev mode (runs Vite + Electron together): `npm run electron:dev`
4. Build a production desktop package: `npm run electron:build` (uses `dist` assets and writes installers to `release/`)
