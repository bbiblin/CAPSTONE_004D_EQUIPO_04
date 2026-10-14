import { Link } from 'react-router-dom';
import { cn } from '@/lib/cn';
import Icon from '@/components/ui/Icon';

interface BackButtonProps {
  className?: string;
}

function BackButton({ className }: BackButtonProps) {
  return (
    <Link
      to="/"
      aria-label="Volver al inicio"
      title="Volver al inicio"
      className={cn(
        'inline-flex items-center justify-center w-11 h-11 shrink-0 rounded-full bg-surface-container-lowest border border-outline-variant text-on-surface transition-colors hover:bg-surface-container',
        className
      )}
    >
      <Icon name="arrow-back" size={20} />
    </Link>
  );
}

export default BackButton;
