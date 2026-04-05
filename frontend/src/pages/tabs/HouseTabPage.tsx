import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
	Check,
	Copy,
	House,
	HousePlus,
	Loader2,
	ScanLine,
	UserMinus,
	Users,
	X,
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiFetch } from '@/lib/api';

type HouseResponse = {
	id: string;
	name: string;
	code: string;
	isPersonal: boolean;
	createdAt: string;
	updatedAt: string;
};

type HouseStatePendingRequestResponse = {
	requestId: string;
	houseId: string;
	houseName: string;
	houseCode: string;
	createdAt: string;
};

type HouseStateResponse = {
	membershipState: 'None' | 'Pending' | 'Member';
	migrationRequired: boolean;
	isOwner: boolean;
	house: HouseResponse | null;
	pendingRequest: HouseStatePendingRequestResponse | null;
};

type HouseMemberSummary = {
	userId: string;
	name: string;
	email: string;
	role: 'Owner' | 'Member' | string;
};

type HouseWithMembersResponse = {
	id: string;
	name: string;
	code: string;
	isPersonal: boolean;
	members: HouseMemberSummary[];
};

type PendingJoinRequestResponse = {
	id: string;
	requesterId: string;
	requesterName: string;
	requesterEmail: string;
	status: string;
	createdAt: string;
};

function toErrorMessage(error: unknown, fallback: string): string {
	if (error instanceof Error && error.message.trim()) {
		return error.message;
	}

	return fallback;
}

function normalizeCode(value: string): string {
	return value
		.toUpperCase()
		.replace(/[^A-Z0-9]/g, '')
		.slice(0, 8)
		.replace(/(.{4})/, '$1-');
}

export function HouseTabPage() {
	const queryClient = useQueryClient();
	const [joinCode, setJoinCode] = useState('');
	const [newHouseName, setNewHouseName] = useState('');
	const [houseNameDraft, setHouseNameDraft] = useState('');
	const [scannerOpen, setScannerOpen] = useState(false);
	const [scannerError, setScannerError] = useState<string | null>(null);
	const [copiedCode, setCopiedCode] = useState(false);
	const videoRef = useRef<HTMLVideoElement | null>(null);
	const streamRef = useRef<MediaStream | null>(null);

	const invalidateHouseScope = async () => {
		await Promise.all([
			queryClient.invalidateQueries({ queryKey: ['house'] }),
			queryClient.invalidateQueries({ queryKey: ['recipes', 'house'] }),
			queryClient.invalidateQueries({ queryKey: ['plans'] }),
		]);
	};

	const houseStateQuery = useQuery({
		queryKey: ['house', 'state'],
		queryFn: () => apiFetch<HouseStateResponse>('/api/houses/state'),
	});

	const houseId = houseStateQuery.data?.house?.id ?? null;

	const membersQuery = useQuery({
		queryKey: ['house', 'members', houseId],
		enabled: Boolean(houseId && houseStateQuery.data?.isOwner),
		queryFn: () => apiFetch<HouseWithMembersResponse>(`/api/houses/${houseId}/members`),
	});

	const pendingQuery = useQuery({
		queryKey: ['house', 'pending', houseId],
		enabled: Boolean(houseId && houseStateQuery.data?.isOwner),
		queryFn: () => apiFetch<PendingJoinRequestResponse[]>(`/api/houses/${houseId}/join-requests`),
	});

	useEffect(() => {
		const stateName = houseStateQuery.data?.house?.name;
		if (stateName) {
			setHouseNameDraft(stateName);
		}
	}, [houseStateQuery.data?.house?.name]);

	const createHouseMutation = useMutation({
		mutationFn: () =>
			apiFetch<HouseResponse>('/api/houses', {
				method: 'POST',
				body: JSON.stringify({ name: newHouseName.trim() }),
			}),
		onSuccess: async () => {
			setNewHouseName('');
			await invalidateHouseScope();
		},
	});

	const requestJoinMutation = useMutation({
		mutationFn: () =>
			apiFetch('/api/houses/join', {
				method: 'POST',
				body: JSON.stringify({ code: joinCode.trim() }),
			}),
		onSuccess: async () => {
			setJoinCode('');
			await invalidateHouseScope();
		},
	});

	const cancelRequestMutation = useMutation({
		mutationFn: (requestId: string) =>
			apiFetch(`/api/houses/join-requests/${requestId}`, {
				method: 'DELETE',
			}),
		onSuccess: invalidateHouseScope,
	});

	const leaveHouseMutation = useMutation({
		mutationFn: () =>
			apiFetch('/api/houses/leave', {
				method: 'POST',
			}),
		onSuccess: invalidateHouseScope,
	});

	const removeMemberMutation = useMutation({
		mutationFn: (userId: string) =>
			apiFetch(`/api/houses/${houseId}/members/${userId}`, {
				method: 'DELETE',
			}),
		onSuccess: async () => {
			await Promise.all([
				invalidateHouseScope(),
				queryClient.invalidateQueries({ queryKey: ['house', 'members', houseId] }),
			]);
		},
	});

	const approveRequestMutation = useMutation({
		mutationFn: (requestId: string) =>
			apiFetch(`/api/houses/${houseId}/join-requests/${requestId}/approve`, {
				method: 'POST',
			}),
		onSuccess: async () => {
			await Promise.all([
				invalidateHouseScope(),
				queryClient.invalidateQueries({ queryKey: ['house', 'pending', houseId] }),
				queryClient.invalidateQueries({ queryKey: ['house', 'members', houseId] }),
			]);
		},
	});

	const rejectRequestMutation = useMutation({
		mutationFn: (requestId: string) =>
			apiFetch(`/api/houses/${houseId}/join-requests/${requestId}/reject`, {
				method: 'POST',
			}),
		onSuccess: () =>
			queryClient.invalidateQueries({ queryKey: ['house', 'pending', houseId] }),
	});

	const renameHouseMutation = useMutation({
		mutationFn: () =>
			apiFetch(`/api/houses/${houseId}/name`, {
				method: 'PUT',
				body: JSON.stringify({ name: houseNameDraft.trim() }),
			}),
		onSuccess: invalidateHouseScope,
	});

	const dissolveHouseMutation = useMutation({
		mutationFn: () =>
			apiFetch(`/api/houses/${houseId}`, {
				method: 'DELETE',
			}),
		onSuccess: invalidateHouseScope,
	});

	const keepMigrationMutation = useMutation({
		mutationFn: () =>
			apiFetch('/api/houses/migration/keep', {
				method: 'POST',
			}),
		onSuccess: invalidateHouseScope,
	});

	const dissolveMigrationMutation = useMutation({
		mutationFn: () =>
			apiFetch('/api/houses/migration/dissolve', {
				method: 'POST',
			}),
		onSuccess: invalidateHouseScope,
	});

	useEffect(() => {
		if (!scannerOpen) {
			setScannerError(null);
			if (streamRef.current) {
				for (const track of streamRef.current.getTracks()) {
					track.stop();
				}
				streamRef.current = null;
			}
			return;
		}

		let intervalId: number | undefined;
		let cancelled = false;

		const start = async () => {
			const BarcodeDetectorImpl = (globalThis as { BarcodeDetector?: new (options?: { formats?: string[] }) => { detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue?: string }>> } }).BarcodeDetector;
			if (!BarcodeDetectorImpl) {
				setScannerError('QR camera scanning is not supported on this browser. Enter the code manually.');
				return;
			}

			if (!navigator.mediaDevices?.getUserMedia) {
				setScannerError('Camera access is not available on this device.');
				return;
			}

			try {
				const detector = new BarcodeDetectorImpl({ formats: ['qr_code'] });
				const stream = await navigator.mediaDevices.getUserMedia({
					video: { facingMode: 'environment' },
					audio: false,
				});

				if (cancelled) {
					for (const track of stream.getTracks()) {
						track.stop();
					}
					return;
				}

				streamRef.current = stream;
				if (videoRef.current) {
					videoRef.current.srcObject = stream;
					await videoRef.current.play();
				}

				intervalId = window.setInterval(async () => {
					if (!videoRef.current) {
						return;
					}

					try {
						const barcodes = await detector.detect(videoRef.current);
						const raw = barcodes[0]?.rawValue?.trim();
						if (raw) {
							setJoinCode(normalizeCode(raw));
							setScannerOpen(false);
						}
					} catch {
						setScannerError('Could not read QR yet. Try better lighting or move the camera closer.');
					}
				}, 500);
			} catch {
				setScannerError('Camera permission is required to scan QR codes.');
			}
		};

		void start();

		return () => {
			cancelled = true;
			if (intervalId) {
				window.clearInterval(intervalId);
			}
			if (streamRef.current) {
				for (const track of streamRef.current.getTracks()) {
					track.stop();
				}
				streamRef.current = null;
			}
		};
	}, [scannerOpen]);

	const onCopyCode = async (value: string) => {
		try {
			await navigator.clipboard.writeText(value);
			setCopiedCode(true);
			window.setTimeout(() => setCopiedCode(false), 1200);
		} catch {
			setCopiedCode(false);
		}
	};

	if (houseStateQuery.isLoading) {
		return (
			<section className='flex h-full items-center justify-center rounded-3xl bg-[#0e1015] p-6 text-[#aeb5be]'>
				<Loader2 className='mr-2 h-5 w-5 animate-spin' />
				Loading house workspace...
			</section>
		);
	}

	if (houseStateQuery.isError || !houseStateQuery.data) {
		return (
			<section className='space-y-4 rounded-3xl bg-[#0e1015] p-4'>
				<Alert variant='destructive'>
					<AlertTitle>Could not load house</AlertTitle>
					<AlertDescription>
						{toErrorMessage(houseStateQuery.error, 'Please try again.')}
					</AlertDescription>
				</Alert>
			</section>
		);
	}

	const state = houseStateQuery.data;

	if (state.migrationRequired) {
		return (
			<section className='relative overflow-hidden rounded-3xl bg-[radial-gradient(circle_at_top,_rgba(116,225,125,0.16),_rgba(8,10,14,1)_58%)] p-4 pb-10 text-[#f3f5f7] sm:p-6'>
				<div className='space-y-5'>
					<p className='text-xs font-semibold uppercase tracking-[0.25em] text-[#8cd7ff]'>
						Migration Required
					</p>
					<h1 className='text-4xl font-extrabold leading-tight'>
						Pick what to do with your personal house
					</h1>
					<p className='max-w-xl text-base text-[#b7bdc7]'>
						To continue using house sharing, keep your legacy house as shared or dissolve it and return to no-house state.
					</p>
					<div className='grid gap-3 sm:grid-cols-2'>
						<Button
							type='button'
							onClick={() => keepMigrationMutation.mutate()}
							disabled={keepMigrationMutation.isPending || dissolveMigrationMutation.isPending}
							className='h-12 rounded-full bg-[#66d56d] text-[#102015] hover:bg-[#7de286]'>
							{keepMigrationMutation.isPending ? 'Keeping...' : 'Keep House'}
						</Button>
						<Button
							type='button'
							variant='destructive'
							onClick={() => dissolveMigrationMutation.mutate()}
							disabled={keepMigrationMutation.isPending || dissolveMigrationMutation.isPending}
							className='h-12 rounded-full bg-[#3b2124] text-[#ffb9b9] hover:bg-[#53262d]'>
							{dissolveMigrationMutation.isPending ? 'Dissolving...' : 'Dissolve House'}
						</Button>
					</div>
				</div>
			</section>
		);
	}

	return (
		<section className='relative overflow-hidden rounded-3xl bg-[radial-gradient(circle_at_top,_rgba(115,226,125,0.18),_rgba(8,10,14,1)_55%)] p-3 pb-24 text-[#f3f5f7] sm:p-5'>
			<div className='absolute -left-12 top-14 h-56 w-56 rounded-full bg-[#74e27d]/10 blur-3xl' />
			<div className='absolute -right-16 bottom-10 h-64 w-64 rounded-full bg-[#94bfff]/10 blur-3xl' />
			<div className='relative space-y-4'>
				<p className='text-xs font-semibold uppercase tracking-[0.25em] text-[#9bc7ff]'>
					Your House
				</p>

				{state.membershipState === 'None' && (
					<div className='space-y-4'>
						<div className='rounded-[2rem] border border-white/10 bg-[#14171d]/90 p-5'>
							<div className='mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-[#1f232a]'>
								<House className='h-12 w-12 text-[#67d56f]' />
							</div>
							<p className='text-center text-4xl font-extrabold leading-tight text-white'>
								You are not part of a house yet
							</p>
							<p className='mx-auto mt-3 max-w-md text-center text-[#b2b8c1]'>
								Join your family or roommates to share recipes and plans.
							</p>

							<div className='mt-5 space-y-3'>
								<label className='text-sm font-semibold text-[#9bc7ff]'>Enter house code</label>
								<Input
									value={joinCode}
									onChange={(event) => setJoinCode(normalizeCode(event.target.value))}
									placeholder='ABCD-1234'
									className='h-12 rounded-full border-white/10 bg-[#0f1116] text-center text-xl tracking-[0.35em] text-white placeholder:text-[#5f6670]'
								/>
								<Button
									type='button'
									onClick={() => requestJoinMutation.mutate()}
									disabled={requestJoinMutation.isPending || joinCode.replace('-', '').length < 8}
									className='h-12 w-full rounded-full bg-[#67d56f] text-lg font-bold text-[#102015] hover:bg-[#7be283]'>
									{requestJoinMutation.isPending ? 'Sending request...' : 'Request to Join'}
								</Button>

								<Button
									type='button'
									variant='outline'
									onClick={() => setScannerOpen((value) => !value)}
									className='h-12 w-full rounded-full border-white/10 bg-[#1f2329] text-white hover:bg-[#292e36]'>
									<ScanLine className='h-4 w-4' />
									{scannerOpen ? 'Close Scanner' : 'Scan QR Code'}
								</Button>

								{scannerOpen && (
									<div className='space-y-2 rounded-2xl border border-white/10 bg-[#0f1116] p-3'>
										<video ref={videoRef} className='w-full rounded-xl bg-black/50' muted playsInline />
										<p className='text-xs text-[#90a6bf]'>Align the QR code in frame. We auto-fill the house code.</p>
										{scannerError && <p className='text-xs text-[#ffb4b4]'>{scannerError}</p>}
									</div>
								)}

								<label className='mt-2 block text-sm font-semibold text-[#9bc7ff]'>Create new house</label>
								<Input
									value={newHouseName}
									onChange={(event) => setNewHouseName(event.target.value)}
									placeholder='The Green Kitchen'
									className='h-12 rounded-full border-white/10 bg-[#0f1116] text-white placeholder:text-[#5f6670]'
								/>
								<Button
									type='button'
									onClick={() => createHouseMutation.mutate()}
									disabled={createHouseMutation.isPending || newHouseName.trim().length < 2}
									className='h-12 w-full rounded-full bg-[#2b3037] text-lg font-bold text-white hover:bg-[#3c434d]'>
									<HousePlus className='h-4 w-4' />
									{createHouseMutation.isPending ? 'Creating...' : 'Create New House'}
								</Button>
							</div>
						</div>

						{(requestJoinMutation.isError || createHouseMutation.isError) && (
							<Alert variant='destructive'>
								<AlertTitle>House action failed</AlertTitle>
								<AlertDescription>
									{toErrorMessage(requestJoinMutation.error ?? createHouseMutation.error, 'Please try again.')}
								</AlertDescription>
							</Alert>
						)}
					</div>
				)}

				{state.membershipState === 'Pending' && state.pendingRequest && (
					<div className='space-y-4 rounded-[2rem] border border-white/10 bg-[#14171d]/90 p-5'>
						<p className='text-xs font-semibold uppercase tracking-[0.25em] text-[#9bc7ff]'>House Access</p>
						<h2 className='text-5xl font-extrabold leading-none text-white'>Request Pending</h2>
						<p className='text-[#b3bac3]'>Your request is waiting for owner approval.</p>

						<div className='grid gap-3 sm:grid-cols-2'>
							<div className='rounded-3xl border border-white/10 bg-[#1c2027] p-4'>
								<p className='text-xs uppercase tracking-[0.2em] text-[#7f8792]'>House Name</p>
								<p className='mt-2 text-3xl font-bold text-[#73df7a]'>{state.pendingRequest.houseName}</p>
							</div>
							<div className='rounded-3xl border border-white/10 bg-[#1c2027] p-4'>
								<p className='text-xs uppercase tracking-[0.2em] text-[#7f8792]'>House Code</p>
								<p className='mt-2 text-3xl font-bold text-white'>{state.pendingRequest.houseCode}</p>
							</div>
						</div>

						<Button
							type='button'
							onClick={() => cancelRequestMutation.mutate(state.pendingRequest!.requestId)}
							disabled={cancelRequestMutation.isPending}
							className='h-12 w-full rounded-full bg-[#2b3037] text-lg font-semibold text-white hover:bg-[#3c434d]'>
							{cancelRequestMutation.isPending ? 'Cancelling...' : 'Cancel Request'}
						</Button>
					</div>
				)}

				{state.membershipState === 'Member' && state.house && !state.isOwner && (
					<div className='space-y-4'>
						<div className='rounded-[2rem] border border-white/10 bg-[#14171d]/90 p-5'>
							<div className='mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-[#1f232a]'>
								<Users className='h-10 w-10 text-[#67d56f]' />
							</div>
							<p className='text-xs font-semibold uppercase tracking-[0.25em] text-[#7ddf85]'>Current Workspace</p>
							<h2 className='mt-2 text-5xl font-extrabold text-white'>{state.house.name}</h2>
							<p className='mt-3 inline-flex rounded-full bg-[#0c0e13] px-4 py-2 text-lg text-[#c3cad3]'>You are part of this house</p>
						</div>

						<div className='rounded-[2rem] border border-white/10 bg-[#14171d]/90 p-5'>
							<p className='text-[#b2b8c1]'>Leaving the house will remove access to shared recipes and plans immediately.</p>
							<Button
								type='button'
								onClick={() => leaveHouseMutation.mutate()}
								disabled={leaveHouseMutation.isPending}
								className='mt-4 h-12 w-full rounded-full bg-[#321f22] text-lg font-semibold text-[#ffb5b5] hover:bg-[#47262a]'>
								{leaveHouseMutation.isPending ? 'Leaving...' : 'Leave House'}
							</Button>
						</div>
					</div>
				)}

				{state.membershipState === 'Member' && state.house && state.isOwner && (
					<div className='space-y-4'>
						<div className='rounded-[2rem] border border-white/10 bg-[#14171d]/90 p-5'>
							<p className='text-xs font-semibold uppercase tracking-[0.25em] text-[#7ddf85]'>House Management</p>
							<h2 className='mt-2 text-5xl font-extrabold text-white'>{state.house.name}</h2>

							<div className='mt-5 grid gap-4 sm:grid-cols-2'>
								<div className='rounded-3xl border border-white/10 bg-[#0f1116] p-4'>
									<p className='text-xs uppercase tracking-[0.2em] text-[#7f8792]'>Invite QR</p>
									<img
										src={`https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(state.house.code)}`}
										alt='House QR code'
										className='mt-3 w-full rounded-2xl border border-white/10 bg-white p-2'
									/>
								</div>
								<div className='rounded-3xl border border-white/10 bg-[#0f1116] p-4'>
									<p className='text-xs uppercase tracking-[0.2em] text-[#7f8792]'>House Code</p>
									<div className='mt-3 flex items-center justify-between rounded-full bg-black/50 px-4 py-3'>
										<p className='text-3xl font-extrabold tracking-[0.15em] text-[#7ce485]'>
											{state.house.code}
										</p>
										<button
											type='button'
											onClick={() => void onCopyCode(state.house!.code)}
											className='rounded-full bg-[#20252d] p-2 text-white'>
											{copiedCode ? <Check className='h-4 w-4 text-[#7ce485]' /> : <Copy className='h-4 w-4' />}
										</button>
									</div>
								</div>
							</div>
						</div>

						<div className='rounded-[2rem] border border-white/10 bg-[#14171d]/90 p-5'>
							<p className='mb-3 text-3xl font-bold text-white'>Members</p>
							{membersQuery.isLoading && <p className='text-[#aeb6bf]'>Loading members...</p>}
							{membersQuery.isSuccess && membersQuery.data.members.length === 0 && (
								<p className='text-[#aeb6bf]'>No members yet.</p>
							)}
							{membersQuery.data?.members.map((member) => {
								const isOwner = member.role === 'Owner';
								return (
									<div
										key={member.userId}
										className='mb-2 flex items-center justify-between rounded-2xl border border-white/10 bg-[#20242b] px-3 py-3'>
										<div>
											<p className='text-lg font-semibold text-white'>{member.name}</p>
											<p className='text-sm text-[#9ca4af]'>{member.email}</p>
										</div>
										{isOwner ? (
											<span className='rounded-full bg-[#243229] px-3 py-1 text-xs font-semibold text-[#7ce485]'>Owner</span>
										) : (
											<button
												type='button'
												onClick={() => removeMemberMutation.mutate(member.userId)}
												disabled={removeMemberMutation.isPending}
												className='rounded-full bg-[#3a2427] p-2 text-[#ffb5b5]'>
												<UserMinus className='h-4 w-4' />
											</button>
										)}
									</div>
								);
							})}
						</div>

						<div className='rounded-[2rem] border border-white/10 bg-[#14171d]/90 p-5'>
							<p className='mb-3 text-3xl font-bold text-white'>Pending Requests</p>
							{pendingQuery.isLoading && <p className='text-[#aeb6bf]'>Loading requests...</p>}
							{pendingQuery.isSuccess && pendingQuery.data.length === 0 && (
								<p className='text-[#aeb6bf]'>No pending requests.</p>
							)}
							{pendingQuery.data?.map((request) => (
								<div
									key={request.id}
									className='mb-2 flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#20242b] px-3 py-3'>
									<div className='min-w-0'>
										<p className='truncate text-lg font-semibold text-white'>{request.requesterName}</p>
										<p className='truncate text-sm text-[#9ca4af]'>{request.requesterEmail}</p>
									</div>
									<div className='flex items-center gap-2'>
										<button
											type='button'
											onClick={() => rejectRequestMutation.mutate(request.id)}
											disabled={rejectRequestMutation.isPending || approveRequestMutation.isPending}
											className='rounded-full bg-[#3a2427] p-2 text-[#ffb5b5]'>
											<X className='h-4 w-4' />
										</button>
										<button
											type='button'
											onClick={() => approveRequestMutation.mutate(request.id)}
											disabled={rejectRequestMutation.isPending || approveRequestMutation.isPending}
											className='rounded-full bg-[#2f4f33] p-2 text-[#7ce485]'>
											<Check className='h-4 w-4' />
										</button>
									</div>
								</div>
							))}
						</div>

						<div className='rounded-[2rem] border border-white/10 bg-[#14171d]/90 p-5'>
							<p className='mb-3 text-3xl font-bold text-white'>Settings</p>
							<label className='text-sm font-semibold text-[#9bc7ff]'>House name</label>
							<Input
								value={houseNameDraft}
								onChange={(event) => setHouseNameDraft(event.target.value)}
								className='mt-2 h-12 rounded-full border-white/10 bg-[#0f1116] text-white'
							/>
							<Button
								type='button'
								onClick={() => renameHouseMutation.mutate()}
								disabled={renameHouseMutation.isPending || houseNameDraft.trim().length < 2}
								className='mt-3 h-12 w-full rounded-full bg-[#66d56d] text-lg font-bold text-[#102015] hover:bg-[#7de286]'>
								{renameHouseMutation.isPending ? 'Saving...' : 'Save changes'}
							</Button>

							<Button
								type='button'
								variant='destructive'
								onClick={() => dissolveHouseMutation.mutate()}
								disabled={dissolveHouseMutation.isPending}
								className='mt-3 h-12 w-full rounded-full bg-[#3b2124] text-lg font-semibold text-[#ffb9b9] hover:bg-[#53262d]'>
								{dissolveHouseMutation.isPending ? 'Dissolving...' : 'Dissolve house'}
							</Button>
						</div>
					</div>
				)}

				{(cancelRequestMutation.isError ||
					leaveHouseMutation.isError ||
					removeMemberMutation.isError ||
					approveRequestMutation.isError ||
					rejectRequestMutation.isError ||
					renameHouseMutation.isError ||
					dissolveHouseMutation.isError) && (
					<Alert variant='destructive'>
						<AlertTitle>House action failed</AlertTitle>
						<AlertDescription>
							{toErrorMessage(
								cancelRequestMutation.error ??
									leaveHouseMutation.error ??
									removeMemberMutation.error ??
									approveRequestMutation.error ??
									rejectRequestMutation.error ??
									renameHouseMutation.error ??
									dissolveHouseMutation.error,
								'Please try again.',
							)}
						</AlertDescription>
					</Alert>
				)}
			</div>
		</section>
	);
}
