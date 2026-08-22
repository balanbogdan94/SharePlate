import { Toaster as SonnerToaster } from 'sonner';
import { useUserSettings } from '@/settings/UserSettingsContext';

export function Toaster() {
	const { theme } = useUserSettings();

	return (
		<SonnerToaster
			theme={theme}
			position="bottom-center"
			richColors
			closeButton
			offset={16}
			toastOptions={{
				classNames: {
					toast: 'rounded-2xl shadow-lg',
				},
			}}
		/>
	);
}
