import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerServiceWorker } from '@/pwa/registerServiceWorker';
import { initializeTelemetry } from '@/lib/telemetry';
import App from './App';
import './index.css';

initializeTelemetry();
registerServiceWorker();

createRoot(document.getElementById('root')!).render(
	<StrictMode>
		<App />
	</StrictMode>,
);
