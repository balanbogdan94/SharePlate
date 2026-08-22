import { useCallback } from 'react';
import { toast } from 'sonner';
import { useI18n } from '@/i18n/I18nContext';
import type { TranslationKey } from '@/i18n/translations';
import { playTone } from '@/lib/feedback/sound';
import { useUserSettings } from '@/settings/UserSettingsContext';

export type FeedbackMessage = { titleKey: TranslationKey; bodyKey?: TranslationKey };

export function useFeedback() {
	const { t } = useI18n();
	const { soundEnabled } = useUserSettings();

	const notifySuccess = useCallback(
		({ titleKey, bodyKey }: FeedbackMessage) => {
			toast.success(t(titleKey), bodyKey ? { description: t(bodyKey) } : undefined);
			playTone('success', soundEnabled);
		},
		[t, soundEnabled],
	);

	const notifyError = useCallback(
		({ titleKey, bodyKey }: FeedbackMessage) => {
			toast.error(t(titleKey), bodyKey ? { description: t(bodyKey) } : undefined);
			playTone('error', soundEnabled);
		},
		[t, soundEnabled],
	);

	return { notifySuccess, notifyError };
}
