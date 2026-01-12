import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      base: './',
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, 'src'),
        }
      },
      build: {
        minify: 'esbuild',
        sourcemap: false,
        cssCodeSplit: true,
        rollupOptions: {
          output: {
            manualChunks: {
              'weather-widget': ['src/components/Browser/widgets/WeatherWidget.tsx'],
              'notes-widget': ['src/components/Browser/widgets/NotesWidget.tsx'],
              'settings': ['src/components/Browser/SettingsPage.tsx'],
              'dev-panel': ['src/components/Browser/DeveloperPanel.tsx']
            }
          }
        }
      }
    };
});
