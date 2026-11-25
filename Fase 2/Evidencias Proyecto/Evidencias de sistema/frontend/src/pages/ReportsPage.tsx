import { useEffect, useMemo, useRef, useState } from 'react';
import { getIncidents } from '@/lib/supabase';
import { DATE_RANGE_OPTIONS, INCIDENT_CATEGORIES, type DateRangeValue } from '@/lib/constants';
import PageHeader from '@/components/layout/PageHeader';
import ReportCard from '@/components/reports/ReportCard';
import Icon from '@/components/ui/Icon';
import { cn } from '@/lib/cn';
import type { Incident } from '@/types';

function ReportsPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRangeValue>('quarter');
  const [loading, setLoading] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(() => (typeof window !== 'undefined' ? window.innerWidth >= 768 : true));
  const filtersContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const onChange = (event: MediaQueryListEvent) => setFiltersOpen(event.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    const el = filtersContentRef.current;
    if (!el) return;
    if (filtersOpen) el.removeAttribute('inert');
    else el.setAttribute('inert', '');
  }, [filtersOpen]);

  const activeFilterCount = (selectedCategory ? 1 : 0) + (dateRange !== 'quarter' ? 1 : 0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getIncidents({ limit: 200 })
      .then(({ data }) => {
        if (active) setIncidents((data as Incident[] | null) ?? []);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const since = useMemo(() => {
    const opt = DATE_RANGE_OPTIONS.find(o => o.value === dateRange);
    const days = opt?.days ?? null;
    if (days == null) return null;
    return new Date(Date.now() - days * 24 * 60 * 60 * 1000).getTime();
  }, [dateRange]);

  const filteredIncidents = useMemo(() => incidents.filter(incident => {
    if (selectedCategory && incident.category !== selectedCategory) return false;
    if (since !== null && new Date(incident.created_at).getTime() < since) return false;
    return true;
  }), [incidents, selectedCategory, since]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <PageHeader
        title="Reportes recientes"
        subtitle="Explora las incidencias de accesibilidad urbana"
        icon={<Icon name="list" className="text-primary" />}
        backToHome
      />

      <div className="border-b border-outline-variant">
        <button
          type="button"
          onClick={() => setFiltersOpen(open => !open)}
          aria-expanded={filtersOpen}
          aria-controls="reports-filters"
          className="md:hidden w-full flex items-center justify-between gap-2 px-margin-mobile py-3 min-h-11 text-label-md font-semibold text-on-surface hover:bg-surface-container-low transition-colors"
        >
          <span className="flex items-center gap-2">
            <Icon name="settings" size={16} className="text-primary" />
            Filtros
            {activeFilterCount > 0 && (
              <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-secondary-container text-on-secondary-container text-label-sm font-semibold">
                {activeFilterCount}
              </span>
            )}
          </span>
          <Icon name="chevron-down" size={18} className={cn('transition-transform duration-300', filtersOpen ? 'rotate-180' : 'rotate-0')} />
        </button>

        <div
          id="reports-filters"
          className={cn('grid transition-[grid-template-rows] duration-300 ease-in-out', filtersOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}
        >
          <div className="overflow-hidden">
            <div
              ref={filtersContentRef}
              aria-hidden={!filtersOpen}
              className={cn(
                'px-margin-mobile md:px-margin-desktop pb-4 space-y-4 transition-opacity duration-300',
                filtersOpen ? 'opacity-100' : 'opacity-0'
              )}
            >
              <div className="space-y-2">
                <p className="text-label-sm text-on-surface-variant/60">Periodo</p>
                <div className="flex flex-wrap gap-2">
                  {DATE_RANGE_OPTIONS.map(opt => (
                    <ChipRow
                      key={opt.value}
                      label={opt.label}
                      active={dateRange === opt.value}
                      onClick={() => setDateRange(opt.value)}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-label-sm text-on-surface-variant/60">Tipo de incidencia</p>
                <div className="flex flex-wrap gap-2">
                  <ChipRow
                    label="Todas"
                    active={selectedCategory === null}
                    onClick={() => setSelectedCategory(null)}
                  />
                  {INCIDENT_CATEGORIES.map(cat => (
                    <ChipRow
                      key={cat.value}
                      label={cat.label}
                      active={selectedCategory === cat.value}
                      onClick={() => setSelectedCategory(selectedCategory === cat.value ? null : cat.value)}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-margin-mobile md:px-margin-desktop py-6 pb-24 md:pb-6">
        <h2 className="text-label-md font-semibold text-on-surface-variant mb-3">
          {filteredIncidents.length} {filteredIncidents.length === 1 ? 'reporte' : 'reportes'}
        </h2>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
          </div>
        ) : filteredIncidents.length === 0 ? (
          <div className="text-center py-12">
            <Icon name="info" className="mx-auto text-on-surface-variant/40 mb-4" size={48} strokeWidth={1.5} />
            <p className="text-body-md text-on-surface-variant">No hay incidencias que coincidan</p>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {filteredIncidents.map(incident => (
              <ReportCard key={incident.id} incident={incident} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ChipRow({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-3.5 py-2.5 min-h-11 rounded-full text-label-sm font-semibold transition-colors',
        active
          ? 'bg-secondary-container text-on-secondary-container'
          : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
      )}
    >
      {label}
    </button>
  );
}

export default ReportsPage;
