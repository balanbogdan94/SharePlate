import { useState } from 'react';
import { cn } from '@/lib/utils';
import { getInitials } from '@/lib/jwt';

type AvatarProps = {
	name: string;
	photoUrl?: string | null;
	className?: string;
	fallbackClassName?: string;
};

export function Avatar({ name, photoUrl, className, fallbackClassName }: AvatarProps) {
	const [hasError, setHasError] = useState(false);
	const showPhoto = Boolean(photoUrl) && !hasError;

	return (
		<span
			className={cn(
				'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full',
				className,
			)}
		>
			{showPhoto ? (
				<img
					src={photoUrl ?? ''}
					alt={name}
					onError={() => setHasError(true)}
					className="h-full w-full object-cover"
				/>
			) : (
				<span
					className={cn(
						'flex h-full w-full items-center justify-center font-semibold leading-none',
						fallbackClassName,
					)}
				>
					{getInitials(name)}
				</span>
			)}
		</span>
	);
}
