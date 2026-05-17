import { useState } from 'react';
import { Camera, Plus, X } from 'lucide-react';

type ImagePickerFieldProps = {
	id: string;
	label?: string;
	value: string;
	onChange: (nextValue: string) => void;
	onFileChange?: (file: File | null) => void;
};

function toErrorMessage(error: unknown, fallback: string): string {
	if (error instanceof Error && error.message.trim()) return error.message;
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

function DropZonePlaceholder() {
	return (
		<div className='flex flex-col items-center gap-3 p-6'>
			<div className='relative'>
				<Camera className='h-9 w-9 text-green-500' />
				<span className='absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-stone-900 dark:bg-stone-600'>
					<Plus className='h-3 w-3 text-green-500' />
				</span>
			</div>
			<p className='text-sm text-stone-400'>
				Drag & drop or <span className='text-green-500'>browse</span>
			</p>
		</div>
	);
}

function ImagePreview({ src, onRemove }: { src: string; onRemove: () => void }) {
	return (
		<div className='relative h-full w-full'>
			<img src={src} alt='Recipe cover' className='h-full w-full object-cover' />
			<button
				type='button'
				aria-label='Remove image'
				onClick={onRemove}
				className='absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-stone-900/60 text-white'>
				<X className='h-4 w-4' />
			</button>
		</div>
	);
}

export function ImagePickerField({ id, label, value, onChange, onFileChange }: ImagePickerFieldProps) {
	const [isDragging, setIsDragging] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const selectFile = async (file: File | null) => {
		if (!file) return;
		if (!file.type.startsWith('image/')) {
			setError('Please choose an image file.');
			return;
		}
		try {
			const dataUrl = await toDataUrl(file);
			onChange(dataUrl);
			onFileChange?.(file);
			setError(null);
		} catch (e) {
			setError(toErrorMessage(e, 'Could not process this image.'));
		}
	};
	const openFilePicker = () => document.getElementById(`${id}-file`)?.click();
	const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
	const onDrop = (e: React.DragEvent) => {
		e.preventDefault();
		setIsDragging(false);
		void selectFile(e.dataTransfer.files?.[0] ?? null);
	};
	const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		void selectFile(e.target.files?.[0] ?? null);
		e.currentTarget.value = '';
	};
	const onRemove = () => { onChange(''); onFileChange?.(null); };
	const onKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === 'Enter' || e.key === ' ') openFilePicker();
	};
	const dropZoneCls = isDragging
		? 'border-green-500 bg-green-500/10'
		: value
			? 'border-transparent'
			: 'border-stone-300 bg-stone-100 dark:border-stone-700 dark:bg-stone-800/70';
	return (
		<div className='space-y-2'>
			{label && <p className='text-sm font-medium text-stone-700 dark:text-stone-300'>{label}</p>}
			<div
				role='button'
				tabIndex={0}
				aria-label='Recipe image drop zone'
				onKeyDown={onKeyDown}
				onClick={!value ? openFilePicker : undefined}
				onDragOver={onDragOver}
				onDragLeave={() => setIsDragging(false)}
				onDrop={onDrop}
				className={`flex h-48 cursor-pointer items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed transition ${dropZoneCls}`}>
				{value ? <ImagePreview src={value} onRemove={onRemove} /> : <DropZonePlaceholder />}
			</div>
			<input
				id={`${id}-file`}
				type='file'
				accept='image/*'
				aria-label='Upload image file'
				className='hidden'
				onChange={onFileInputChange}
			/>
			{error && <p className='text-xs text-red-600 dark:text-red-400'>{error}</p>}
		</div>
	);
}
