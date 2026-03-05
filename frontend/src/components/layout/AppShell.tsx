import { useEffect, useRef, useState } from 'react';
import {
	Link,
	Outlet,
	useLocation,
	useNavigate,
} from '@tanstack/react-router';
import { House, Layers3, Settings2, UserCircle2 } from 'lucide-react';
import { useAuth } from '@/auth/AuthContext';
import { apiFetch } from '@/lib/api';

type TabItem = {
	to: '/' | '/tab-2' | '/tab-3';
	label: string;
	icon: typeof House;
};

const tabs: TabItem[] = [
	{ to: '/', label: 'Home', icon: House },
	{ to: '/tab-2', label: 'Board', icon: Layers3 },
	{ to: '/tab-3', label: 'More', icon: Settings2 },
];

export function AppShell() {
	const auth = useAuth();
	const navigate = useNavigate();
	const location = useLocation();
	const [menuOpen, setMenuOpen] = useState(false);
	const menuRef = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		const onDocumentClick = (event: MouseEvent) => {
			if (!menuRef.current?.contains(event.target as Node)) {
				setMenuOpen(false);
			}
		};

		document.addEventListener('mousedown', onDocumentClick);
		return () => document.removeEventListener('mousedown', onDocumentClick);
	}, []);

	const handleLogout = async () => {
		const refreshToken = auth.tokens?.refreshToken;
		setMenuOpen(false);

		if (refreshToken) {
			try {
				await apiFetch<void>('/auth/logout', {
					method: 'POST',
					body: JSON.stringify({ refreshToken }),
				});
			} catch {
				// Ignore logout API failure and clear local auth regardless.
			}
		}

		auth.logout();
		await navigate({ to: '/login' });
	};

	return (
		<div className='min-h-screen bg-stone-100 text-stone-900'>
			<header className='sticky top-0 z-20 border-b border-stone-200/80 bg-white/90 backdrop-blur-md'>
				<div className='mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-4'>
					<p className='text-base font-semibold tracking-tight'>SharePlate</p>

					<div className='relative' ref={menuRef}>
						<button
							type='button'
							onClick={() => setMenuOpen((prev) => !prev)}
							className='inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-3 py-1.5 text-sm font-medium text-stone-700 shadow-sm transition hover:bg-stone-50'>
							<UserCircle2 className='h-5 w-5' />
							Profile
						</button>

						{menuOpen && (
							<div className='absolute right-0 mt-2 w-40 rounded-xl border border-stone-200 bg-white p-2 shadow-lg'>
								<button
									type='button'
									onClick={handleLogout}
									className='w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-red-600 transition hover:bg-red-50'>
									Logout
								</button>
							</div>
						)}
					</div>
				</div>
			</header>

			<main className='mx-auto h-[calc(100vh-10rem)] w-full max-w-5xl px-4 py-4'>
				<Outlet />
			</main>

			<footer className='fixed bottom-0 left-0 right-0 z-20 border-t border-stone-200/80 bg-white/90 pb-4 pt-2 backdrop-blur-md'>
				<div className='mx-auto grid w-full max-w-md grid-cols-3 gap-2 rounded-2xl bg-stone-100/80 p-2'>
					{tabs.map((tab) => {
						const Icon = tab.icon;
						const isActive = location.pathname === tab.to;

						return (
							<Link
								key={tab.to}
								to={tab.to}
								className={`flex flex-col items-center gap-1 rounded-xl px-2 py-2 text-xs font-medium transition ${
									isActive
										? 'bg-white text-stone-900 shadow-sm'
										: 'text-stone-500 hover:text-stone-700'
								}`}>
								<Icon className='h-4 w-4' />
								<span>{tab.label}</span>
							</Link>
						);
					})}
				</div>
			</footer>
		</div>
	);
}
