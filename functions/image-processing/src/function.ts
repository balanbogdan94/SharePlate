import { app } from '@azure/functions';
import { createDependencies, readSettings } from './adapters.js';
import { InvalidImage } from './conversion.js';
import { processImageEvent, WorkerError, type WorkerDependencies } from './worker.js';

let dependencies: WorkerDependencies | undefined;

app.eventGrid('optimizeImage', {
	handler: async (event, context) => {
		try {
			dependencies ??= createDependencies(readSettings(process.env));
			const outcome = await processImageEvent(event, dependencies);
			context.info('image_worker_result', outcome);
		} catch (error) {
			const code = error instanceof WorkerError || error instanceof InvalidImage
				? error.message : 'image_processing_failed';
			// SDK/DB exception text can contain credentials or source URLs.
			context.error('image_worker_failed', { code });
			throw new Error(code);
		}
	},
});
