import { useMemo, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { SendIcon } from 'lucide-react';

type PlanRemindersExportProps = {
	planId: string;
	onExport: () => Promise<void>;
	isExporting: boolean;
	errorMessage: string | null;
	fallbackText: string | null;
};

type FallbackPanelProps = {
	planId: string;
	fallbackText: string;
};

function canShareText(): boolean {
	return typeof navigator !== 'undefined' && typeof navigator.share === 'function';
}

async function copyToClipboard(text: string): Promise<void> {
	if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
		throw new Error('Clipboard is not available.');
	}
	await navigator.clipboard.writeText(text);
}

function FallbackPanel({ planId, fallbackText }: FallbackPanelProps) {
	const [status, setStatus] = useState<string | null>(null);
	const hasShare = useMemo(() => canShareText(), []);

	const onCopy = async () => {
		try {
			await copyToClipboard(fallbackText);
			setStatus('Copied ingredient list.');
		} catch (error) {
			const message =
				error instanceof Error && error.message.trim()
					? error.message
					: 'Could not copy ingredient list.';
			setStatus(message);
		}
	};

	const onShare = async () => {
		if (!hasShare) {
			return;
		}
		try {
			await navigator.share({ title: 'SharePlate Ingredients', text: fallbackText });
			setStatus('Share sheet opened.');
		} catch {
			setStatus('Share cancelled.');
		}
	};

	return (
		<div
			className="space-y-2 rounded-2xl border border-white/10 bg-[#14161c]/80 p-3"
			data-testid={`reminders-fallback-${planId}`}
		>
			<p className="text-sm font-semibold text-white">Export fallback</p>
			<p className="text-xs text-[#afb5be]">
				Shortcuts bridge is unavailable. Copy or share this list.
			</p>
			<div className="flex flex-wrap gap-2">
				<Button
					type="button"
					onClick={() => void onCopy()}
					className="h-10 rounded-full bg-[#2f3338] px-3 text-xs font-bold text-[#9cc7ff] hover:bg-[#3a3f45]"
				>
					Copy ingredients
				</Button>
				{hasShare && (
					<Button
						type="button"
						onClick={() => void onShare()}
						className="h-10 rounded-full bg-[#2f3338] px-3 text-xs font-bold text-[#ff9fbc] hover:bg-[#3a3f45]"
					>
						Share ingredients
					</Button>
				)}
			</div>
			{status && <p className="text-xs text-[#98a0aa]">{status}</p>}
		</div>
	);
}

export function PlanRemindersExport({
	planId,
	onExport,
	isExporting,
	errorMessage,
	fallbackText,
}: PlanRemindersExportProps) {
	return (
		<div className="space-y-2">
			<Button
				type="button"
				onClick={onExport}
				disabled={isExporting}
				className="h-10 w-10 rounded-full bg-[#2f3338] px-4 text-sm font-bold text-[#7ce485] hover:bg-[#3a3f45] sm:text-base"
			>
				<SendIcon className="h-1 w-1" />
			</Button>
			{errorMessage && (
				<Alert variant="destructive">
					<AlertTitle>Could not export reminders</AlertTitle>
					<AlertDescription>{errorMessage}</AlertDescription>
				</Alert>
			)}
			{fallbackText && <FallbackPanel planId={planId} fallbackText={fallbackText} />}
		</div>
	);
}
