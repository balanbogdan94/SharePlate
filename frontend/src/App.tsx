import { Button } from '@/components/ui/button';

function App() {
	return (
		<main className='min-h-screen bg-background text-foreground'>
			<div className='mx-auto flex min-h-screen max-w-3xl items-center justify-center px-6 py-12'>
				<div className='text-center'>
					<h1 className='text-3xl font-semibold tracking-tight'>SharePlate</h1>
					<p className='mt-3 text-muted-foreground'>
						React + TypeScript + TanStack Query + Tailwind + shadcn/ui starter
					</p>
					<div className='mt-6'>
						<Button>Get Started</Button>
					</div>
				</div>
			</div>
		</main>
	);
}

export default App;
