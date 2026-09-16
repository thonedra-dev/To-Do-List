import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  assetsInclude: ['**/*.glb', '**/*.gltf'],
  server: {
    port: 5173,
    // Proxy API calls straight to Flask during dev. This means the frontend
    // fetches, e.g., '/dashboard_data' as a same-origin request from the
    // browser's point of view -- Vite forwards it to localhost:5000 behind
    // the scenes. That sidesteps cross-origin cookie headaches entirely, so
    // credentials: 'include' in api.js is a safety net more than a strict
    // requirement in dev. (In production, Flask will need to serve the
    // built frontend, or you keep CORS+credentials as already configured
    // in backend.py for a fully split deployment.)
    proxy: {
    '/api': 'http://localhost:5000',
    '/static': 'http://localhost:5000',
    },
  },
});
