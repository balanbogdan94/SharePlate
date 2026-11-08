import { Component } from 'react';
import type { ReactNode } from 'react';
import { translations } from '@/i18n/translations';
import { reportFailure } from '@/lib/telemetry';
import { Button } from '@/components/ui/button';

export function CrashFallback() {
	const language = document.documentElement.lang === 'ro' ? 'ro' : 'en';
	return (
		<main className="flex min-h-screen items-center justify-center bg-background p-6">
			<div className="max-w-sm space-y-4 text-center">
				<p role="alert">{translations[language]['error.unexpected']}</p>
				<Button onClick={() => window.location.reload()}>
					{translations[language]['error.reload']}
				</Button>
			</div>
		</main>
	);
}

export class AppErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
	state = { failed: false };

	static getDerivedStateFromError() {
		return { failed: true };
	}

	componentDidCatch(error: Error) {
		reportFailure(error, 'react.crashed');
	}

	render() {
		return this.state.failed ? <CrashFallback /> : this.props.children;
	}
}
