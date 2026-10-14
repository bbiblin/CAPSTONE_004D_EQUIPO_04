import type { ReactNode } from 'react';
import BackButton from '@/components/ui/BackButton';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  actions?: ReactNode;
  backToHome?: boolean;
}

function PageHeader({ title, subtitle, icon, actions, backToHome }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-4 px-margin-mobile md:px-margin-desktop py-6">
      <div className="flex items-center gap-3 md:gap-4 min-w-0">
        {backToHome && <BackButton />}
        {icon && <div className="hidden md:flex w-12 h-12 rounded-xl bg-surface-container items-center justify-center text-primary">{icon}</div>}
        <div className="min-w-0">
          <h1 className="text-headline-lg-mobile md:text-headline-lg font-bold text-on-surface truncate">{title}</h1>
          {subtitle && <p className="text-body-md text-on-surface-variant truncate">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-3 shrink-0">{actions}</div>}
    </div>
  );
}

export default PageHeader;
