import type { Incident } from '@/types';
import { getIncidentVisibility, VISIBILITY_LABELS, VISIBILITY_COLORS, VISIBILITY_ICONS } from '@/lib/constants';
import { cn } from '@/lib/cn';

interface ReportStatusProps {
  incident: Incident;
  className?: string;
}

function ReportStatus({ incident, className }: ReportStatusProps) {
  const visibility = getIncidentVisibility(incident);
  const color = VISIBILITY_COLORS[visibility];
  const Icon = VISIBILITY_ICONS[visibility];

  return (
    <span
      className={cn('inline-flex items-center gap-1 px-3 py-1 rounded-full text-label-sm font-semibold whitespace-nowrap', className)}
      style={{ backgroundColor: `${color}20`, color }}
    >
      {Icon && <Icon size={13} strokeWidth={2.5} />}
      {VISIBILITY_LABELS[visibility]}
    </span>
  );
}

export default ReportStatus;
