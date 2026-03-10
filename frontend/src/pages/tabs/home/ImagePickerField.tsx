import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

type ImagePickerFieldProps = {
	id: string;
	label: string;
	value: string;
	onChange: (nextValue: string) => void;
	onFileChange?: (file: File | null) => void;
};

function toErrorMessage(error: unknown, fallback: string): string {
	if (error instanceof Error && error.message.trim()) {
		return error.message;
	}

	return fallback;
}

function toDataUrl(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(String(reader.result ?? ''));
		reader.onerror = () => reject(new Error('Could not read image file.'));
		reader.readAsDataURL(file);
	});
}

export function ImagePickerField({
	id,
	label,
	value,
	onChange,
	onFileChange,
}: ImagePickerFieldProps) {
	const [isDragging, setIsDragging] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const selectFile = async (file: File | null) => {
		if (!file) {
			return;
		}

		if (!file.type.startsWith('image/')) {
			setError('Please choose an image file.');
			return;
		}

		try {
			const dataUrl = await toDataUrl(file);
			onChange(dataUrl);
			onFileChange?.(file);
			setError(null);
		} catch (readError) {
			setError(toErrorMessage(readError, 'Could not process this image.'));
		}
	};

	return (
		<div className='space-y-2'>
			<Label>{label}</Label>
			<div
				onDragOver={(event) => {
					event.preventDefault();
					setIsDragging(true);
				}}
				onDragLeave={() => setIsDragging(false)}
				onDrop={(event) => {
					event.preventDefault();
					setIsDragging(false);
					void selectFile(event.dataTransfer.files?.[0] ?? null);
				}}
				className={`space-y-2 rounded-md border border-dashed p-3 ${
					isDragging
						? 'border-stone-500 bg-stone-50 dark:border-stone-300 dark:bg-stone-800/40'
						: 'border-stone-300 dark:border-stone-700'
				}`}>
				<p className='text-xs text-stone-600 dark:text-stone-300'>
					Drag and drop an image here
				</p>
				<div className='flex flex-wrap gap-2'>
					<Label
						htmlFor={`${id}-file`}
						className='inline-flex h-10 cursor-pointer items-center justify-center rounded-md border border-stone-300 px-3 text-sm font-medium text-stone-800 dark:border-stone-600 dark:text-stone-100'>
						Choose image
					</Label>
					<input
						id={`${id}-file`}
						type='file'
						accept='image/*'
						className='hidden'
						onChange={(event) => {
							void selectFile(event.target.files?.[0] ?? null);
							event.currentTarget.value = '';
						}}
					/>

					<Label
						htmlFor={`${id}-camera`}
						className='inline-flex h-10 cursor-pointer items-center justify-center rounded-md border border-stone-300 px-3 text-sm font-medium text-stone-800 dark:border-stone-600 dark:text-stone-100'>
						Take photo
					</Label>
					<input
						id={`${id}-camera`}
						type='file'
						accept='image/*'
						capture='environment'
						className='hidden'
						onChange={(event) => {
							void selectFile(event.target.files?.[0] ?? null);
							event.currentTarget.value = '';
						}}
					/>

					{value && (
						<Button
							type='button'
							variant='outline'
							onClick={() => {
								onChange('');
								onFileChange?.(null);
							}}>
							Remove
						</Button>
					)}
				</div>

				{value && (
					<img
						src={value}
						alt='Recipe'
						className='h-36 w-full rounded-md border border-stone-200 object-cover dark:border-stone-700'
					/>
				)}
			</div>
			{error && (
				<p className='text-xs text-red-600 dark:text-red-400'>{error}</p>
			)}
		</div>
	);
}
