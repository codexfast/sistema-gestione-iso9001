import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    server: {
        port: 5173,
        open: true,
        proxy: {
            '/api/v1': {
                target: 'https://www.fr-busato.it:8443',
                changeOrigin: true,
                secure: false
            }
        }
    }
});
