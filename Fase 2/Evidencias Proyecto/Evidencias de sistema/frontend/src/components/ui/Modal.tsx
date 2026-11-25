import { useEffect, useId, useRef } from 'react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

function Modal({ open, onClose, title, children, footer }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;

    const previousFocus = document.activeElement as HTMLElement | null;

    const lockScroll = () => { document.body.style.overflow = 'hidden'; };
    const unlockScroll = () => { document.body.style.overflow = ''; };

    lockScroll();

    const focusables = () => Array.from(
      dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []
    );

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCloseRef.current();
        return;
      }
      if (e.key === 'Tab') {
        const items = focusables();
        if (items.length === 0) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', onKey);

    // Solo se enfoca al ABRIR el modal (no en cada render), para no robar el
    // foco mientras el usuario escribe. Se prefiere un elemento con `autoFocus`.
    const frame = requestAnimationFrame(() => {
      const items = focusables();
      const preferred =
        items.find((el) => el.matches('[autofocus]')) ?? items[0];
      if (preferred) preferred.focus();
      else dialogRef.current?.focus();
    });

    return () => {
      document.removeEventListener('keydown', onKey);
      unlockScroll();
      cancelAnimationFrame(frame);
      previousFocus?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[1100] flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
        className="relative bg-surface-container-lowest w-full md:max-w-lg rounded-t-2xl md:rounded-lg max-h-[90dvh] flex flex-col focus:outline-none animate-[pageIn_.28s_ease]"
      >
        {title && (
          <div className="shrink-0 border-b border-outline-variant px-5 py-4 flex items-center justify-between">
            <h3 id={titleId} className="text-headline-md font-semibold">{title}</h3>
            <button onClick={onClose} aria-label="Cerrar" className="inline-flex items-center justify-center w-11 h-11 shrink-0 rounded-full hover:bg-surface-container transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        <div className={cn('flex-1 overflow-y-auto p-5', !title && (footer ? 'pb-0' : ''))}>{children}</div>
        {footer && <div className="shrink-0 border-t border-outline-variant px-5 py-4">{footer}</div>}
      </div>
    </div>
  );
}

export default Modal;
