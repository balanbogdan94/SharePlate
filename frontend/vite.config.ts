import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { parseTelemetryConfig } from './src/lib/telemetryConfig';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
	parseTelemetryConfig(loadEnv(mode, process.cwd(), 'VITE_'), mode === 'production');
	return {
		plugins: [react()],
		resolve: {
			alias: {
				'@': path.resolve(__dirname, './src'),
			},
		},
		build: {
			rollupOptions: {
				input: {
					main: path.resolve(__dirname, 'index.html'),
					redirect: path.resolve(__dirname, 'redirect.html'),
				},
			},
		},
		server: {
			proxy: {
				'/api': {
					target: process.env.DEV_API_TARGET ?? 'http://localhost:5211',
					changeOrigin: true,
				},
			},
		},
	};
});
