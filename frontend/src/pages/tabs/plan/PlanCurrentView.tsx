import { useNavigate } from '@tanstack/react-router';
import { PenLine } from 'lucide-react';
import type { RecipeSummary } from '@/pages/tabs/home/types';
import type { PlanDetails } from '@/pages/tabs/plan/types';
import { formatDisplayDate } from '@/pages/tabs/plan/planUtils';
import { PlanDaySection } from '@/pages/tabs/plan/PlanDaySection';
import { PlanRemindersExport } from '@/pages/tabs/plan/PlanRemindersExport';

type ExportProps = {
	planId: string;
	isExporting: boolean;
	errorMessage: string | null;
	fallbackText: string | null;
	onExport: () => Promise<void>;
};

type Props = {
	plan: PlanDetails;
	expandedDayDate: string | null;
	onToggleDay: (date: string) => void;
	recipeMap: Map<string, RecipeSummary>;
	exportProps: ExportProps;
};

export function PlanCurrentView({
	plan,
	expandedDayDate,
	onToggleDay,
	recipeMap,
	exportProps,
}: Props) {
	const navigate = useNavigate();
	const activeExpandedDayDate = expandedDayDate ?? plan.days[0]?.date ?? null;

	return (
		<div>
			<div className="mb-2 flex items-center gap-3">
				<p className="flex-1 text-xl font-bold text-[#9cc7ff]">
					{formatDisplayDate(plan.startDate)} – {formatDisplayDate(plan.endDate)}
				</p>
				<button
					type="button"
					aria-label="Edit plan"
					onClick={() => void navigate({ to: '/plans/$planId/edit', params: { planId: plan.id } })}
					className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-[#2f3237] text-[#7ce485]"
				>
					<PenLine className="h-4 w-4" />
				</button>
				<PlanRemindersExport
					planId={exportProps.planId}
					onExport={exportProps.onExport}
					isExporting={exportProps.isExporting}
					errorMessage={exportProps.errorMessage}
					fallbackText={exportProps.fallbackText}
				/>
			</div>
			<div>
				{plan.days.map((day) => (
					<PlanDaySection
						key={day.date}
						day={day}
						isExpanded={activeExpandedDayDate === day.date}
						onToggle={() => onToggleDay(day.date)}
						recipeMap={recipeMap}
						canAddRecipe={true}
						planId={plan.id}
					/>
				))}
			</div>
		</div>
	);
}
