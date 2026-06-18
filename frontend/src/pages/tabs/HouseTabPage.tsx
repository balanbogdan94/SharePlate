import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Copy, House, Loader2, Pencil, ScanLine, UserMinus, Users, X } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar } from '@/components/ui/avatar';
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
	membershipState: 'None' | 'Owner' | 'Member';
	isOwner: boolean;
	canLeave: boolean;
	house: HouseResponse | null;
	pendingRequest: HouseStatePendingRequestResponse | null;
};

type HouseMemberSummary = {
	userId: string;
	name: string;
	email: string;
	profilePictureUrl: string;
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
	requesterProfilePictureUrl: string;
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
	const [houseNameDraft, setHouseNameDraft] = useState('');
	const [scannerOpen, setScannerOpen] = useState(false);
	const [scannerError, setScannerError] = useState<string | null>(null);
	const [copiedCode, setCopiedCode] = useState(false);
	const [renamingActive, setRenamingActive] = useState(false);
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
			// eslint-disable-next-line react-hooks/set-state-in-effect
			setHouseNameDraft(stateName);
		}
	}, [houseStateQuery.data?.house?.name]);

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
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ['house', 'pending', houseId] }),
	});

	const renameHouseMutation = useMutation({
		mutationFn: () =>
			apiFetch(`/api/houses/${houseId}/name`, {
				method: 'PUT',
				body: JSON.stringify({ name: houseNameDraft.trim() }),
			}),
		onSuccess: invalidateHouseScope,
	});

	useEffect(() => {
		if (!scannerOpen) {
			return;
		}

		let intervalId: number | undefined;
		let cancelled = false;

		const start = async () => {
			const BarcodeDetectorImpl = (
				globalThis as {
					BarcodeDetector?: new (options?: { formats?: string[] }) => {
						detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue?: string }>>;
					};
				}
			).BarcodeDetector;
			if (!BarcodeDetectorImpl) {
				setScannerError(
					'QR camera scanning is not supported on this browser. Enter the code manually.',
				);
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
						setScannerError(
							'Could not read QR yet. Try better lighting or move the camera closer.',
						);
					}
				}, 500);
			} catch {
				setScannerError('Camera permission is required to scan QR codes.');
			}
		};

		void start();

		return () => {
			cancelled = true;
			setScannerError(null);
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
			<div className="flex h-full items-center justify-center gap-2 text-stone-500 dark:text-stone-400">
				<Loader2 className="h-5 w-5 animate-spin" />
				<span className="text-sm">Loading...</span>
			</div>
		);
	}

	if (houseStateQuery.isError || !houseStateQuery.data) {
		return (
			<div className="space-y-4 pb-8 pt-2">
				<Alert variant="destructive">
					<AlertTitle>Could not load house</AlertTitle>
					<AlertDescription>
						{toErrorMessage(houseStateQuery.error, 'Please try again.')}
					</AlertDescription>
				</Alert>
			</div>
		);
	}

	const state = houseStateQuery.data;

	return (
		<div className="space-y-6 pb-8 pt-2">
			<h1 className="text-[2rem] font-bold tracking-tight text-stone-900 dark:text-stone-50">
				House
			</h1>

			{state.membershipState === 'None' && (
				<div className="space-y-6">
					<div className="space-y-1.5">
						<p className="px-4 text-xs font-semibold uppercase tracking-widest text-stone-500 dark:text-stone-400">
							Join a House
						</p>
						<div className="overflow-hidden rounded-2xl bg-white shadow-sm dark:bg-stone-900">
							<div className="px-4 py-4">
								<div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-green-100 dark:bg-green-900/40">
									<House className="h-8 w-8 text-green-600 dark:text-green-400" />
								</div>
								<p className="font-semibold text-stone-900 dark:text-stone-100">
									You are not part of a house yet
								</p>
								<p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
									Join your family or roommates to share recipes and plans.
								</p>
							</div>
							<div className="mx-4 h-px bg-stone-200 dark:bg-stone-700/60" />
							<div className="space-y-3 px-4 py-4">
								<Input
									value={joinCode}
									onChange={(event) => setJoinCode(normalizeCode(event.target.value))}
									placeholder="ABCD-1234"
									className="h-11 rounded-xl text-center text-lg tracking-[0.3em]"
								/>
								<Button
									type="button"
									onClick={() => requestJoinMutation.mutate()}
									disabled={requestJoinMutation.isPending || joinCode.replace('-', '').length < 8}
									className="h-11 w-full rounded-xl bg-green-500 font-semibold text-white hover:bg-green-600"
								>
									{requestJoinMutation.isPending ? 'Sending request...' : 'Request to Join'}
								</Button>
								<Button
									type="button"
									variant="outline"
									onClick={() => setScannerOpen((v) => !v)}
									className="h-11 w-full rounded-xl"
								>
									<ScanLine className="h-4 w-4" />
									{scannerOpen ? 'Close Scanner' : 'Scan QR Code'}
								</Button>
								{scannerOpen && (
									<div className="space-y-2 rounded-xl border border-stone-200 bg-stone-50 p-3 dark:border-stone-700 dark:bg-stone-800">
										<video ref={videoRef} className="w-full rounded-lg" muted playsInline />
										<p className="text-xs text-stone-500 dark:text-stone-400">
											Align the QR code in frame. We auto-fill the house code.
										</p>
										{scannerError && <p className="text-xs text-red-500">{scannerError}</p>}
									</div>
								)}
							</div>
						</div>
					</div>

					{requestJoinMutation.isError && (
						<Alert variant="destructive">
							<AlertTitle>House action failed</AlertTitle>
							<AlertDescription>
								{toErrorMessage(requestJoinMutation.error, 'Please try again.')}
							</AlertDescription>
						</Alert>
					)}
				</div>
			)}

			{state.canLeave && state.house && (
				<div className="space-y-6">
					<div className="overflow-hidden rounded-2xl bg-white shadow-sm dark:bg-stone-900">
						<div className="flex min-h-[68px] items-center gap-4 px-4 py-3">
							<div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-green-100 dark:bg-green-900/40">
								<Users className="h-6 w-6 text-green-600 dark:text-green-400" />
							</div>
							<div>
								<p className="font-semibold text-stone-900 dark:text-stone-100">
									{state.house.name}
								</p>
								<p className="text-sm text-stone-500 dark:text-stone-400">Member</p>
							</div>
						</div>
						<div className="mx-4 h-px bg-stone-200 dark:bg-stone-700/60" />
						<p className="px-4 py-3 text-sm text-stone-500 dark:text-stone-400">
							Your own house is paused while you are a member here. Leave to switch back to it.
						</p>
					</div>

					<div className="overflow-hidden rounded-2xl bg-white shadow-sm dark:bg-stone-900">
						<button
							type="button"
							onClick={() => leaveHouseMutation.mutate()}
							disabled={leaveHouseMutation.isPending}
							className="flex min-h-[52px] w-full items-center gap-3 px-4 py-3 active:bg-stone-100 dark:active:bg-stone-800"
						>
							<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-red-500">
								<X className="h-4 w-4 text-white" />
							</div>
							<span className="text-base font-medium text-red-500">
								{leaveHouseMutation.isPending ? 'Leaving...' : 'Leave House'}
							</span>
						</button>
					</div>
				</div>
			)}

			{!state.canLeave && state.house && (
				<div className="space-y-6">
					<div className="overflow-hidden rounded-2xl bg-white shadow-sm dark:bg-stone-900">
						<div className="flex min-h-[68px] items-center gap-4 px-4 py-3">
							<div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-green-100 dark:bg-green-900/40">
								<House className="h-6 w-6 text-green-600 dark:text-green-400" />
							</div>
							<div>
								<p className="font-semibold text-stone-900 dark:text-stone-100">
									{state.house.name}
								</p>
								<span className="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-900/40 dark:text-green-400">
									Owner
								</span>
							</div>
						</div>
					</div>

					<div className="space-y-1.5">
						<p className="px-4 text-xs font-semibold uppercase tracking-widest text-stone-500 dark:text-stone-400">
							Invite
						</p>
						<div className="overflow-hidden rounded-2xl bg-white shadow-sm dark:bg-stone-900">
							<div className="flex justify-center px-6 py-6">
								<div className="h-52 w-52 shrink-0 overflow-hidden rounded-2xl border border-stone-200 bg-white p-3 shadow-sm">
									<img
										src={`https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(state.house.code)}`}
										alt="House QR code"
										className="h-full w-full rounded-lg"
									/>
								</div>
							</div>
							<div className="mx-4 h-px bg-stone-200 dark:bg-stone-700/60" />
							<div className="flex min-h-[52px] items-center gap-3 px-4 py-2">
								<span className="flex-1 font-mono text-lg font-bold tracking-[0.2em] text-stone-900 dark:text-stone-100">
									{state.house.code}
								</span>
								<button
									type="button"
									onClick={() => void onCopyCode(state.house!.code)}
									className="flex h-8 w-8 items-center justify-center rounded-full bg-stone-100 text-stone-600 transition hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700"
								>
									{copiedCode ? (
										<Check className="h-4 w-4 text-green-500" />
									) : (
										<Copy className="h-4 w-4" />
									)}
								</button>
							</div>
						</div>
					</div>

					<div className="space-y-1.5">
						<p className="px-4 text-xs font-semibold uppercase tracking-widest text-stone-500 dark:text-stone-400">
							Members
						</p>
						<div className="overflow-hidden rounded-2xl bg-white shadow-sm dark:bg-stone-900">
							{membersQuery.isLoading && (
								<p className="px-4 py-4 text-sm text-stone-500 dark:text-stone-400">
									Loading members...
								</p>
							)}
							{membersQuery.isSuccess && membersQuery.data.members.length === 0 && (
								<p className="px-4 py-4 text-sm text-stone-500 dark:text-stone-400">
									No members yet.
								</p>
							)}
							{membersQuery.data?.members.map((member, index) => {
								const isOwnerMember = member.role === 'Owner';
								const isLast = index === (membersQuery.data?.members.length ?? 0) - 1;
								return (
									<div key={member.userId}>
										<div className="flex min-h-[60px] items-center gap-3 px-4 py-3">
											<Avatar
												name={member.name}
												photoUrl={member.profilePictureUrl}
												className="h-9 w-9"
												fallbackClassName="bg-stone-200 text-sm text-stone-700 dark:bg-stone-700 dark:text-stone-200"
											/>
											<div className="min-w-0 flex-1">
												<p className="truncate font-medium text-stone-900 dark:text-stone-100">
													{member.name}
												</p>
												<p className="truncate text-xs text-stone-500 dark:text-stone-400">
													{member.email}
												</p>
											</div>
											{isOwnerMember ? (
												<span className="shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-900/40 dark:text-green-400">
													Owner
												</span>
											) : (
												<button
													type="button"
													onClick={() => removeMemberMutation.mutate(member.userId)}
													disabled={removeMemberMutation.isPending}
													className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-500 transition hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40"
												>
													<UserMinus className="h-4 w-4" />
												</button>
											)}
										</div>
										{!isLast && (
											<div className="ml-[3.5rem] h-px bg-stone-200 dark:bg-stone-700/60" />
										)}
									</div>
								);
							})}
						</div>
					</div>

					{pendingQuery.isSuccess && pendingQuery.data.length > 0 && (
						<div className="space-y-1.5">
							<p className="px-4 text-xs font-semibold uppercase tracking-widest text-stone-500 dark:text-stone-400">
								Pending Requests
							</p>
							<div className="overflow-hidden rounded-2xl bg-white shadow-sm dark:bg-stone-900">
								{pendingQuery.data.map((request, index) => {
									const isLast = index === (pendingQuery.data?.length ?? 0) - 1;
									return (
										<div key={request.id}>
											<div className="flex min-h-[60px] items-center gap-3 px-4 py-3">
												<Avatar
													name={request.requesterName}
													photoUrl={request.requesterProfilePictureUrl}
													className="h-9 w-9"
													fallbackClassName="bg-amber-100 text-sm text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
												/>
												<div className="min-w-0 flex-1">
													<p className="truncate font-medium text-stone-900 dark:text-stone-100">
														{request.requesterName}
													</p>
													<p className="truncate text-xs text-stone-500 dark:text-stone-400">
														{request.requesterEmail}
													</p>
												</div>
												<div className="flex items-center gap-2">
													<button
														type="button"
														onClick={() => rejectRequestMutation.mutate(request.id)}
														disabled={
															rejectRequestMutation.isPending || approveRequestMutation.isPending
														}
														className="flex h-8 w-8 items-center justify-center rounded-full bg-red-50 text-red-500 transition hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40"
													>
														<X className="h-4 w-4" />
													</button>
													<button
														type="button"
														onClick={() => approveRequestMutation.mutate(request.id)}
														disabled={
															rejectRequestMutation.isPending || approveRequestMutation.isPending
														}
														className="flex h-8 w-8 items-center justify-center rounded-full bg-green-50 text-green-600 transition hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/40"
													>
														<Check className="h-4 w-4" />
													</button>
												</div>
											</div>
											{!isLast && (
												<div className="ml-[3.5rem] h-px bg-stone-200 dark:bg-stone-700/60" />
											)}
										</div>
									);
								})}
							</div>
						</div>
					)}

					<div className="space-y-1.5">
						<p className="px-4 text-xs font-semibold uppercase tracking-widest text-stone-500 dark:text-stone-400">
							House Settings
						</p>
						<div className="overflow-hidden rounded-2xl bg-white shadow-sm dark:bg-stone-900">
							{!renamingActive ? (
								<button
									type="button"
									onClick={() => setRenamingActive(true)}
									className="flex min-h-[52px] w-full items-center gap-3 px-4 py-3 active:bg-stone-50 dark:active:bg-stone-800"
								>
									<span className="flex-1 text-left text-base text-stone-900 dark:text-stone-100">
										{houseNameDraft}
									</span>
									<Pencil className="h-4 w-4 text-stone-400 dark:text-stone-500" />
								</button>
							) : (
								<div className="space-y-3 px-4 py-4">
									<Input
										autoFocus
										value={houseNameDraft}
										onChange={(event) => setHouseNameDraft(event.target.value)}
										className="h-11 rounded-xl"
									/>
									<div className="flex gap-2">
										<Button
											type="button"
											variant="outline"
											onClick={() => {
												setHouseNameDraft(state.house!.name);
												setRenamingActive(false);
											}}
											className="h-11 flex-1 rounded-xl"
										>
											Cancel
										</Button>
										<Button
											type="button"
											onClick={() => {
												renameHouseMutation.mutate();
												setRenamingActive(false);
											}}
											disabled={renameHouseMutation.isPending || houseNameDraft.trim().length < 2}
											className="h-11 flex-1 rounded-xl bg-green-500 font-semibold text-white hover:bg-green-600"
										>
											{renameHouseMutation.isPending ? 'Saving...' : 'Save'}
										</Button>
									</div>
								</div>
							)}
						</div>
					</div>

					<div className="space-y-1.5">
						<p className="px-4 text-xs font-semibold uppercase tracking-widest text-stone-500 dark:text-stone-400">
							Join Another House
						</p>
						{state.pendingRequest ? (
							<div className="space-y-3">
								<div className="overflow-hidden rounded-2xl bg-white shadow-sm dark:bg-stone-900">
									<div className="px-4 py-4">
										<p className="text-xs font-semibold uppercase tracking-widest text-stone-500 dark:text-stone-400">
											Awaiting Approval
										</p>
										<p className="mt-2 font-semibold text-stone-900 dark:text-stone-100">
											Your request to join {state.pendingRequest.houseName} is waiting for approval.
										</p>
										<p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
											When approved, your own house pauses until you leave.
										</p>
									</div>
									<div className="mx-4 h-px bg-stone-200 dark:bg-stone-700/60" />
									<div className="flex items-center gap-3 px-4 py-3">
										<span className="text-sm text-stone-500 dark:text-stone-400">Code</span>
										<span className="flex-1 text-right font-mono font-bold tracking-widest text-stone-900 dark:text-stone-100">
											{state.pendingRequest.houseCode}
										</span>
									</div>
								</div>
								<div className="overflow-hidden rounded-2xl bg-white shadow-sm dark:bg-stone-900">
									<button
										type="button"
										onClick={() => cancelRequestMutation.mutate(state.pendingRequest!.requestId)}
										disabled={cancelRequestMutation.isPending}
										className="flex min-h-[52px] w-full items-center gap-3 px-4 py-3 active:bg-stone-100 dark:active:bg-stone-800"
									>
										<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-red-500">
											<X className="h-4 w-4 text-white" />
										</div>
										<span className="text-base font-medium text-red-500">
											{cancelRequestMutation.isPending ? 'Cancelling...' : 'Cancel Request'}
										</span>
									</button>
								</div>
							</div>
						) : (
							<div className="overflow-hidden rounded-2xl bg-white shadow-sm dark:bg-stone-900">
								<div className="px-4 py-4">
									<p className="text-sm text-stone-500 dark:text-stone-400">
										Enter a code to join another house. Your own house stays and pauses until you
										leave it.
									</p>
								</div>
								<div className="mx-4 h-px bg-stone-200 dark:bg-stone-700/60" />
								<div className="space-y-3 px-4 py-4">
									<Input
										value={joinCode}
										onChange={(event) => setJoinCode(normalizeCode(event.target.value))}
										placeholder="ABCD-1234"
										className="h-11 rounded-xl text-center text-lg tracking-[0.3em]"
									/>
									<Button
										type="button"
										onClick={() => requestJoinMutation.mutate()}
										disabled={requestJoinMutation.isPending || joinCode.replace('-', '').length < 8}
										className="h-11 w-full rounded-xl bg-green-500 font-semibold text-white hover:bg-green-600"
									>
										{requestJoinMutation.isPending ? 'Sending request...' : 'Request to Join'}
									</Button>
									<Button
										type="button"
										variant="outline"
										onClick={() => setScannerOpen((v) => !v)}
										className="h-11 w-full rounded-xl"
									>
										<ScanLine className="h-4 w-4" />
										{scannerOpen ? 'Close Scanner' : 'Scan QR Code'}
									</Button>
									{scannerOpen && (
										<div className="space-y-2 rounded-xl border border-stone-200 bg-stone-50 p-3 dark:border-stone-700 dark:bg-stone-800">
											<video ref={videoRef} className="w-full rounded-lg" muted playsInline />
											<p className="text-xs text-stone-500 dark:text-stone-400">
												Align the QR code in frame. We auto-fill the house code.
											</p>
											{scannerError && <p className="text-xs text-red-500">{scannerError}</p>}
										</div>
									)}
								</div>
							</div>
						)}
					</div>
				</div>
			)}

			{(cancelRequestMutation.isError ||
				requestJoinMutation.isError ||
				leaveHouseMutation.isError ||
				removeMemberMutation.isError ||
				approveRequestMutation.isError ||
				rejectRequestMutation.isError ||
				renameHouseMutation.isError) && (
				<Alert variant="destructive">
					<AlertTitle>House action failed</AlertTitle>
					<AlertDescription>
						{toErrorMessage(
							cancelRequestMutation.error ??
								requestJoinMutation.error ??
								leaveHouseMutation.error ??
								removeMemberMutation.error ??
								approveRequestMutation.error ??
								rejectRequestMutation.error ??
								renameHouseMutation.error,
							'Please try again.',
						)}
					</AlertDescription>
				</Alert>
			)}
		</div>
	);
}
