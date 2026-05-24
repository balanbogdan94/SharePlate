import { useCallback } from 'react';

function tryParse<T>(raw: string | null): T | null {
if (!raw) return null;
try {
return JSON.parse(raw) as T;
} catch {
return null;
}
}

export function readDraftOnce<T>(key: string): T | null {
return tryParse<T>(sessionStorage.getItem(key));
}

export function useDraft(key: string) {
const write = useCallback(
<T>(value: T): void => {
try {
sessionStorage.setItem(key, JSON.stringify(value));
} catch {
sessionStorage.removeItem(key);
}
},
[key],
);

const clear = useCallback((): void => {
sessionStorage.removeItem(key);
}, [key]);

return { write, clear };
}
