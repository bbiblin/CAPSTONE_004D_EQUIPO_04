import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAdminIncidents, getProfile, getReportedIncidents, updateReportStatus, hideIncident, restoreIncident } from '@/lib/supabase';
import { INCIDENT_CATEGORIES, SEVERITY_LEVELS, getIncidentVisibility, VISIBILITY_LABELS } from '@/lib/constants';
import { computeScore } from '@/lib/utils';
import PageHeader from '@/components/layout/PageHeader';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';
import Alert from '@/components/ui/Alert';
import Icon from '@/components/ui/Icon';
import ReportStatus from '@/components/reports/ReportStatus';
import { cn } from '@/lib/cn';
import type { IncidentVisibility } from '@/types';
import type { Incident, Profile, IncidentReport } from '@/types';

const VISIBILITY_OPTIONS: { value: IncidentVisibility | 'all'; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'activo', label: VISIBILITY_LABELS.activo },
  { value: 'inactivo_rechazo', label: VISIBILITY_LABELS.inactivo_rechazo },
  { value: 'inactivo_resuelta', label: VISIBILITY_LABELS.inactivo_resuelta },
  { value: 'oculto_moderacion', label: VISIBILITY_LABELS.oculto_moderacion },
];

function AdminPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [visibilityFilter, setVisibilityFilter] = useState<IncidentVisibility | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(() => (typeof window !== 'undefined' ? window.innerWidth >= 768 : true));
  const [profile, setProfile] = useState<Profile | null>(null);
  const [activeTab, setActiveTab] = useState<'incidents' | 'reports'>('incidents');
  const [reports, setReports] = useState<IncidentReport[]>([]);
  const [loadReportsError, setLoadReportsError] = useState<string | null>(null);
  const [loadingReports, setLoadingReports] = useState(false);
  const [expandedReportId, setExpandedReportId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const filtersContentRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => { loadProfile(); }, []);

  useEffect(() => {
    const el = filtersContentRef.current;
    if (!el) return;
    if (filtersOpen) el.removeAttribute('inert');
    else el.setAttribute('inert', '');
  }, [filtersOpen]);

  useEffect(() => {
    if (profile && profile.role !== 'admin') {
      navigate('/');
    } else if (profile?.role === 'admin') {
      loadIncidents();
      loadReports();
    }
  }, [profile]);

  useEffect(() => {
    if (activeTab === 'reports' && profile?.role === 'admin') {
      loadReports();
    }
  }, [activeTab]);

  async function loadProfile() {
    const p = await getProfile();
    setProfile(p);
  }

  async function loadIncidents() {
    const { data } = await getAdminIncidents({ limit: 500 });
    if (data) setIncidents(data);
  }

  async function loadReports() {
    setLoadingReports(true);
    const { data, error } = await getReportedIncidents();
    if (data) setReports(data);
    if (error) setLoadReportsError(error.message);
    setLoadingReports(false);
  }

  function filterByVisibility(i: Incident): IncidentVisibility {
    return getIncidentVisibility(i);
  }

  const filteredIncidents = useMemo(() => incidents.filter(i => {
    if (visibilityFilter !== 'all' && filterByVisibility(i) !== visibilityFilter) return false;
    if (categoryFilter && i.category !== categoryFilter) return false;
    if (dateFrom) {
      const d = new Date(i.created_at).getTime();
      if (d < new Date(dateFrom).getTime()) return false;
    }
    if (dateTo) {
      const d = new Date(i.created_at).getTime();
      const end = new Date(dateTo).getTime() + 24 * 60 * 60 * 1000 - 1;
      if (d > end) return false;
    }
    return true;
  }), [incidents, visibilityFilter, categoryFilter, dateFrom, dateTo]);

  const pendingReports = useMemo(() => reports.filter(r => r.status === 'pendiente').length, [reports]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (visibilityFilter !== 'all') count++;
    if (categoryFilter) count++;
    if (dateFrom) count++;
    if (dateTo) count++;
    return count;
  }, [visibilityFilter, categoryFilter, dateFrom, dateTo]);

  async function handleReportStatus(reportId: string, status: 'resuelto' | 'rechazado') {
    const { error } = await updateReportStatus(reportId, status);
    if (!error) loadReports();
  }

  async function handleHide(id: string) {
    setActionError(null);
    setActionNotice(null);
    const reason = window.prompt('Motivo de la baja (opcional):') || undefined;
    const { error } = await hideIncident(id, profile!.id, reason);
    if (error) {
      setActionError(error.message);
      return;
    }
    setActionNotice('Incidencia dada de baja (oculta para el usuario final).');
    // Refrescar la incidencia seleccionada para que el detalle refleje la baja
    // (y muestre el botón "Restaurar") sin depender de un refetch.
    setSelectedIncident(prev => (prev && prev.id === id ? { ...prev, hidden_at: new Date().toISOString(), hidden_by: profile!.id, hidden_reason: reason ?? null } : prev));
    loadIncidents();
    loadReports();
  }

  async function handleRestore(id: string) {
    setActionError(null);
    setActionNotice(null);
    const { error } = await restoreIncident(id);
    if (error) {
      setActionError(error.message);
      return;
    }
    setActionNotice('Incidencia restaurada (visible nuevamente).');
    setSelectedIncident(prev => (prev && prev.id === id ? { ...prev, hidden_at: null, hidden_by: null, hidden_reason: null } : prev));
    loadIncidents();
    loadReports();
  }

  if (!profile) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const selectedVisibility = selectedIncident ? filterByVisibility(selectedIncident) : null;

  if (activeTab === 'reports') {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <PageHeader title="Administración" subtitle="Moderación de reportes y denuncias" icon={<Icon name="settings" className="text-primary" />} backToHome />
        <Tabs activeTab={activeTab} setActiveTab={setActiveTab} pendingReports={pendingReports} />
        <div className="flex-1 overflow-y-auto px-margin-mobile md:px-margin-desktop py-6">
          {actionError && <Alert tone="error" className="mb-4">{actionError}</Alert>}
          {actionNotice && <Alert tone="success" className="mb-4">{actionNotice}</Alert>}
          <h2 className="text-label-md font-semibold text-on-surface mb-4">Denuncias de incidencias</h2>
          {loadReportsError && <Alert tone="error" className="mb-4">Error al cargar: {loadReportsError}</Alert>}
          {loadingReports ? (
            <div className="flex items-center justify-center py-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : reports.length === 0 && !loadReportsError ? (
            <p className="text-body-md text-on-surface-variant text-center py-10">No hay denuncias registradas</p>
          ) : (
            <div className="space-y-3">
              {reports.map(report => {
                const incident = report.incidents;
                const visibility = incident ? filterByVisibility(incident) : null;
                return (
                  <Card key={report.id}>
                    <div className="flex items-center justify-between gap-3">
                      <h4 className="text-label-md font-semibold text-on-surface">
                        {incident ? (INCIDENT_CATEGORIES.find(c => c.value === incident.category)?.label || incident.category) : 'Incidente eliminado'}
                      </h4>
                      <Badge tone="warning">{report.status}</Badge>
                    </div>
                    {incident && (
                      <>
                        <p className="text-label-sm text-on-surface-variant mt-1">{incident.description}</p>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-label-sm text-on-surface-variant">
                          <span>Denunciante: {report.reporter?.display_name || report.reported_by}</span>
                          <span>Fecha: {new Date(report.created_at).toLocaleDateString('es-CL')}</span>
                          {report.reason && <span>Motivo: {report.reason}</span>}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          {visibility && <ReportStatus incident={incident} />}
                          <span className="text-label-sm text-on-surface-variant">Rechazos: {incident.votes_down}/{incident.downvote_threshold} · Resuetas: {incident.votes_resuelta}/{incident.resuelto_threshold}</span>
                        </div>
                      </>
                    )}
                    <div className="flex flex-wrap gap-2 mt-3">
                      {report.status === 'pendiente' && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => handleReportStatus(report.id, 'resuelto')} className="text-on-surface">Marcar resuelta</Button>
                          <Button size="sm" variant="destructive" onClick={() => handleReportStatus(report.id, 'rechazado')}>Rechazar denuncia</Button>
                        </>
                      )}
                      {incident && !incident.hidden_at && (
                        <Button size="sm" variant="destructive" onClick={() => handleHide(incident.id)}>Dar de baja</Button>
                      )}
                      {incident && incident.hidden_at && (
                        <Button size="sm" variant="outline" onClick={() => handleRestore(incident.id)} className="text-on-surface">Restaurar</Button>
                      )}
                      {incident && (
                        <Button size="sm" variant="ghost" onClick={() => setExpandedReportId(expandedReportId === report.id ? null : report.id)}>
                          {expandedReportId === report.id ? 'Cerrar detalle' : 'Ver detalle'}
                        </Button>
                      )}
                    </div>
                    {expandedReportId === report.id && incident && (
                      <div className="mt-3 pt-3 border-t border-outline-variant space-y-3">
                        {incident.image_url && (
                          <div>
                            <span className="text-label-sm text-on-surface-variant">Evidencia fotográfica</span>
                            <img src={incident.image_url} alt="Evidencia" className="mt-1 w-full h-48 object-cover rounded" />
                          </div>
                        )}
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-label-sm text-on-surface-variant">
                          <span>Severidad: {SEVERITY_LEVELS.find(s => s.value === incident.severity)?.label}</span>
                          <span>Duración: {incident.estimated_duration}</span>
                          <span>Fecha observación: {new Date(incident.observed_at).toLocaleDateString('es-CL')}</span>
                          <span>Fecha reporte: {new Date(incident.created_at).toLocaleDateString('es-CL')}</span>
                          {incident.place_name && <span>Lugar: {incident.place_name}</span>}
                          {incident.address && <span>Dirección: {incident.address}</span>}
                        </div>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <PageHeader title="Administración" subtitle="Gestión de reportes" icon={<Icon name="settings" className="text-primary" />} backToHome />
      <Tabs activeTab={activeTab} setActiveTab={setActiveTab} pendingReports={pendingReports} />

      <div className="flex-1 flex overflow-hidden">
        <div
          className={cn(
            'shrink-0 bg-surface-container-lowest border-r border-outline-variant flex-col overflow-hidden',
            'w-full md:w-96 flex',
            selectedIncident && 'hidden md:flex'
          )}
        >
          <button
            type="button"
            onClick={() => setFiltersOpen(o => !o)}
            aria-expanded={filtersOpen}
            aria-controls="admin-filters"
            className="w-full flex items-center justify-between gap-2 p-3 min-h-11 border-b border-outline-variant text-label-md font-semibold text-on-surface hover:bg-surface-container-low transition-colors"
          >
            <span className="flex items-center gap-2">
              <Icon name="settings" size={16} className="text-primary" />
              Filtros
              {activeFilterCount > 0 && (
                <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-secondary-container text-on-secondary-container text-label-sm font-semibold">{activeFilterCount}</span>
              )}
            </span>
            <Icon name="chevron-down" size={18} className={cn('transition-transform duration-300', filtersOpen ? 'rotate-180' : 'rotate-0')} />
          </button>
          <div
            id="admin-filters"
            className={cn('grid transition-[grid-template-rows] duration-300 ease-in-out', filtersOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}
          >
            <div className="overflow-hidden">
              <div
                ref={filtersContentRef}
                aria-hidden={!filtersOpen}
                className={cn('p-3 border-b border-outline-variant space-y-2 transition-opacity duration-300', filtersOpen ? 'opacity-100' : 'opacity-0')}
              >
                <Select label="Visibilidad" value={visibilityFilter} onChange={(e) => setVisibilityFilter(e.target.value as IncidentVisibility | 'all')}>
                  {VISIBILITY_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </Select>
                <Select label="Categoría" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                  <option value="">Todas</option>
                  {INCIDENT_CATEGORIES.map(cat => <option key={cat.value} value={cat.value}>{cat.label}</option>)}
                </Select>
                <div className="grid grid-cols-2 gap-2">
                  <Input label="Desde" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                  <Input label="Hasta" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                </div>
              </div>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            <h3 className="text-label-md font-semibold text-on-surface mb-3">Reportes ({filteredIncidents.length})</h3>
            <div className="space-y-2">
              {filteredIncidents.map(incident => (
                <div
                  key={incident.id}
                  onClick={() => setSelectedIncident(incident)}
                  className={cn(
                    'bg-surface-container-lowest border rounded-lg p-3 cursor-pointer transition-colors',
                    selectedIncident?.id === incident.id ? 'border-primary ring-1 ring-primary' : 'border-outline-variant hover:bg-surface-container-low'
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-label-md font-semibold text-on-surface">{INCIDENT_CATEGORIES.find(c => c.value === incident.category)?.label}</h4>
                    <ReportStatus incident={incident} />
                  </div>
                  <p className="text-label-sm text-on-surface-variant mt-1">{incident.description.substring(0, 80)}...</p>
                  <div className="flex items-center gap-2 mt-2 text-label-sm text-on-surface-variant">
                    <span>{SEVERITY_LEVELS.find(s => s.value === incident.severity)?.label}</span>
                    <span>·</span>
                    <span>{new Date(incident.created_at).toLocaleDateString('es-CL')}</span>
                    <span>·</span>
                    <span>Score: {computeScore(incident.votes_up, incident.votes_down)}</span>
                  </div>
                </div>
              ))}
              {filteredIncidents.length === 0 && (
                <p className="text-label-sm text-on-surface-variant text-center py-8">No hay reportes que coincidan</p>
              )}
            </div>
          </div>
        </div>

        <div className={cn('flex-1 bg-background overflow-y-auto p-4 md:p-6', selectedIncident ? 'block' : 'hidden md:block')}>
          {selectedIncident ? (
            <Card>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-headline-md font-bold text-on-surface">{INCIDENT_CATEGORIES.find(c => c.value === selectedIncident.category)?.label}</h2>
                  <button onClick={() => setSelectedIncident(null)} className="mt-1 md:hidden text-label-sm text-on-surface-variant hover:text-on-surface inline-flex items-center gap-1">
                    <Icon name="arrow-back" size={14} /> Volver a la lista
                  </button>
                </div>
                {selectedVisibility && <ReportStatus incident={selectedIncident} />}
              </div>
              <p className="text-body-md text-on-surface-variant mt-2">{selectedIncident.description}</p>

              <div className="grid grid-cols-2 gap-4 mt-4">
                <DetailField label="Severidad" value={SEVERITY_LEVELS.find(s => s.value === selectedIncident.severity)?.label} />
                <DetailField label="Duración" value={selectedIncident.estimated_duration} />
                <DetailField label="Fecha observación" value={new Date(selectedIncident.observed_at).toLocaleDateString('es-CL')} />
                <DetailField label="Fecha reporte" value={new Date(selectedIncident.created_at).toLocaleDateString('es-CL')} />
                <DetailField label="Score" value={String(computeScore(selectedIncident.votes_up, selectedIncident.votes_down))} />
                <DetailField label="Confirmaciones" value={String(selectedIncident.votes_up)} />
                <DetailField label="Rechazos" value={`${selectedIncident.votes_down}/${selectedIncident.downvote_threshold}`} />
                <DetailField label="Votos resuelta" value={`${selectedIncident.votes_resuelta}/${selectedIncident.resuelto_threshold}`} />
                <DetailField label="Ocultado por moderación" value={selectedIncident.hidden_at ? new Date(selectedIncident.hidden_at).toLocaleString('es-CL') : 'No'} />
                {selectedIncident.hidden_reason && <DetailField label="Motivo de baja" value={selectedIncident.hidden_reason} />}
              </div>

              {selectedIncident.image_url && (
                <div className="mt-4">
                  <span className="text-label-sm text-on-surface-variant">Evidencia fotográfica</span>
                  <img src={selectedIncident.image_url} alt="Evidencia" className="mt-2 w-full h-48 object-cover rounded" />
                </div>
              )}

              {actionError && <Alert tone="error" className="mt-4">{actionError}</Alert>}
              {actionNotice && <Alert tone="success" className="mt-4">{actionNotice}</Alert>}

              <div className="mt-4 flex gap-2 flex-wrap items-center">
                {!selectedIncident.hidden_at ? (
                  <Button variant="destructive" onClick={() => handleHide(selectedIncident.id)}>Dar de baja</Button>
                ) : (
                  <Button variant="outline" onClick={() => handleRestore(selectedIncident.id)} className="text-on-surface">Restaurar</Button>
                )}
                <Button variant="ghost" onClick={() => { setActiveTab('reports'); loadReports(); }}>Ver denuncias</Button>
              </div>
            </Card>
          ) : (
            <div className="flex items-center justify-center h-full text-on-surface-variant">
              Selecciona un reporte para ver los detalles
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Tabs({ activeTab, setActiveTab, pendingReports }: { activeTab: 'incidents' | 'reports'; setActiveTab: (t: 'incidents' | 'reports') => void; pendingReports: number }) {
  const tabClass = (isActive: boolean) => cn(
    'px-4 py-3 text-label-md font-semibold border-b-2 transition-colors',
    isActive ? 'border-secondary-container text-secondary' : 'border-transparent text-on-surface-variant hover:text-on-surface'
  );

  return (
    <div className="px-margin-mobile md:px-margin-desktop border-b border-outline-variant">
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('incidents')}
          aria-current={activeTab === 'incidents' ? 'page' : undefined}
          className={tabClass(activeTab === 'incidents')}
        >
          Reportes
        </button>
        <button
          onClick={() => setActiveTab('reports')}
          aria-current={activeTab === 'reports' ? 'page' : undefined}
          className={cn('relative', tabClass(activeTab === 'reports'))}
        >
          Denuncias
          {pendingReports > 0 && <span className="ml-2 inline-flex items-center justify-center min-w-5 h-5 px-1 rounded-full bg-secondary-container text-on-secondary-container text-label-sm font-semibold">{pendingReports}</span>}
        </button>
      </div>
    </div>
  );
}

function DetailField({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <span className="text-label-sm text-on-surface-variant">{label}</span>
      <p className="text-label-md text-on-surface">{value}</p>
    </div>
  );
}

export default AdminPage;
