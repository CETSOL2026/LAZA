import { useState, useRef, useEffect } from 'react';
import {
  LayoutDashboard,
  Database,
  BarChart3,
  Users,
  Code2,
  FileText,
  Settings,
  Search,
  Bell,
  ChevronDown,
  Plus,
  Upload,
  Download,
  Filter,
  Eye,
  Pencil,
  Trash2,
  X,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  CalendarDays,
  ToggleLeft,
  ToggleRight,
  Menu,
  LogOut,
  TrendingUp,
} from 'lucide-react';
import logoFull from '../../imports/Artboard_1_3.png';
import { pilotIndicators } from '../data/indicators';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Dataset {
  id: number;
  name: string;
  source: string;
  category: string;
  status: 'Active' | 'Draft';
  lastUpdated: string;
  owner: string;
}

interface Toast {
  id: number;
  type: 'success' | 'error';
  message: string;
}

// ─── Sample Data ──────────────────────────────────────────────────────────────
const SAMPLE_DATASETS: Dataset[] = pilotIndicators.map((indicator, index) => ({
  id: index + 1,
  name: indicator.label,
  source: indicator.sourceName,
  category: indicator.domain,
  status: indicator.status === 'published' ? 'Active' : 'Draft',
  lastUpdated: indicator.period,
  owner: 'LAZA Data Steward',
}));

const SIDEBAR_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'data-management', label: 'Data Management', icon: Database },
  { id: 'indicators', label: 'Indicators', icon: TrendingUp },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'api', label: 'API', icon: Code2 },
  { id: 'cms', label: 'CMS', icon: FileText },
  { id: 'settings', label: 'Settings', icon: Settings },
];

// ─── Toast Component ──────────────────────────────────────────────────────────
function ToastNotification({ toasts, removeToast }: { toasts: Toast[]; removeToast: (id: number) => void }) {
  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl border pointer-events-auto min-w-[300px] animate-in slide-in-from-right-4 fade-in duration-300 ${
            toast.type === 'success'
              ? 'bg-white border-green-100 text-foreground'
              : 'bg-white border-red-100 text-foreground'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
          )}
          <span className="text-sm flex-1">{toast.message}</span>
          <button
            onClick={() => removeToast(toast.id)}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

// ─── Edit Drawer ──────────────────────────────────────────────────────────────
function EditDrawer({
  dataset,
  onClose,
  onSave,
}: {
  dataset: Dataset | null;
  onClose: () => void;
  onSave: (data: Partial<Dataset>) => void;
}) {
  const [form, setForm] = useState<Partial<Dataset>>(dataset || {});
  const [statusActive, setStatusActive] = useState(dataset?.status === 'Active');

  useEffect(() => {
    setForm(dataset || {});
    setStatusActive(dataset?.status === 'Active');
  }, [dataset]);

  if (!dataset) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-40"
        onClick={onClose}
      />
      {/* Drawer */}
      <div className="fixed top-0 right-0 h-full w-[420px] bg-white shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <div>
            <h3 className="text-foreground">Edit Dataset</h3>
            <p className="text-sm text-muted-foreground mt-0.5">Update dataset information</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
          <div>
            <label className="block text-sm text-muted-foreground mb-1.5">Dataset Name</label>
            <input
              value={form.name || ''}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2.5 rounded-lg border border-border bg-muted/40 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm"
            />
          </div>
          <div>
            <label className="block text-sm text-muted-foreground mb-1.5">Source</label>
            <input
              value={form.source || ''}
              onChange={(e) => setForm({ ...form, source: e.target.value })}
              className="w-full px-3 py-2.5 rounded-lg border border-border bg-muted/40 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm"
            />
          </div>
          <div>
            <label className="block text-sm text-muted-foreground mb-1.5">Category</label>
            <select
              value={form.category || ''}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full px-3 py-2.5 rounded-lg border border-border bg-muted/40 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm"
            >
              <option>Economic</option>
              <option>Financial</option>
              <option>Society</option>
              <option>Infrastructure</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-muted-foreground mb-1.5">Update Frequency</label>
            <select className="w-full px-3 py-2.5 rounded-lg border border-border bg-muted/40 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm">
              <option>Monthly</option>
              <option>Quarterly</option>
              <option>Annual</option>
              <option>Real-time</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-muted-foreground mb-1.5">Status</label>
            <button
              onClick={() => setStatusActive(!statusActive)}
              className="flex items-center gap-3 group"
            >
              {statusActive ? (
                <ToggleRight className="w-10 h-6 text-primary" />
              ) : (
                <ToggleLeft className="w-10 h-6 text-muted-foreground" />
              )}
              <span className={`text-sm ${statusActive ? 'text-primary' : 'text-muted-foreground'}`}>
                {statusActive ? 'Active' : 'Draft'}
              </span>
            </button>
          </div>
          <div>
            <label className="block text-sm text-muted-foreground mb-1.5">Upload File</label>
            <div className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-primary/40 transition-colors cursor-pointer group">
              <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2 group-hover:text-primary transition-colors" />
              <p className="text-sm text-muted-foreground">
                Drop files here or{' '}
                <span className="text-primary underline">browse</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">CSV, XLSX, JSON — max 50MB</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 px-6 py-5 border-t border-border">
          <button
            onClick={() => onSave({ ...form, status: statusActive ? 'Active' : 'Draft' })}
            className="flex-1 bg-primary text-white py-2.5 rounded-lg text-sm hover:bg-primary/90 transition-colors"
          >
            Save Changes
          </button>
          <button
            onClick={onClose}
            className="flex-1 border border-border text-foreground py-2.5 rounded-lg text-sm hover:bg-muted transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Main Admin Dashboard ─────────────────────────────────────────────────────
export function AdminDashboard({ onBack }: { onBack: () => void }) {
  const [activeNav, setActiveNav] = useState('data-management');
  const [datasets, setDatasets] = useState<Dataset[]>(SAMPLE_DATASETS);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [editingDataset, setEditingDataset] = useState<Dataset | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [page, setPage] = useState(1);
  const [rowsPerPage] = useState(5);
  const [profileOpen, setProfileOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [notifOpen, setNotifOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const addToast = (type: 'success' | 'error', message: string) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  };

  const removeToast = (id: number) => setToasts((prev) => prev.filter((t) => t.id !== id));

  const handleSave = (data: Partial<Dataset>) => {
    setDatasets((prev) =>
      prev.map((d) => (d.id === editingDataset?.id ? { ...d, ...data } : d))
    );
    setEditingDataset(null);
    addToast('success', 'Dataset updated successfully');
  };

  const handleDelete = (id: number) => {
    setDatasets((prev) => prev.filter((d) => d.id !== id));
    addToast('success', 'Dataset deleted successfully');
  };

  // Filtered datasets
  const filtered = datasets.filter((d) => {
    const matchSearch = d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.source.toLowerCase().includes(search.toLowerCase());
    const matchCategory = categoryFilter === 'All' || d.category === categoryFilter;
    const matchStatus = statusFilter === 'All' || d.status === statusFilter;
    return matchSearch && matchCategory && matchStatus;
  });

  const totalPages = Math.ceil(filtered.length / rowsPerPage);
  const paginated = filtered.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  const categories = ['All', ...Array.from(new Set(datasets.map((d) => d.category)))];

  return (
    <div className="flex h-screen bg-[#f5f6fa] overflow-hidden">
      {/* ── Sidebar ── */}
      <aside
        className={`${sidebarOpen ? 'w-60' : 'w-16'} bg-secondary text-white flex flex-col transition-all duration-300 shrink-0 z-30`}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-white/10 h-[72px]">
          {sidebarOpen ? (
            <img src={logoFull} alt="LAZA" className="h-8 object-contain" />
          ) : (
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shrink-0">
              <span className="text-white text-xs">L</span>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 space-y-1 overflow-y-auto">
          {SIDEBAR_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeNav === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveNav(item.id)}
                title={!sidebarOpen ? item.label : undefined}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-all relative group ${
                  isActive
                    ? 'bg-primary text-white'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                } ${sidebarOpen ? '' : 'justify-center'}`}
              >
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-white rounded-r-full" />
                )}
                <Icon className="w-4 h-4 shrink-0" />
                {sidebarOpen && <span>{item.label}</span>}
                {!sidebarOpen && (
                  <div className="absolute left-full ml-2 px-2 py-1 bg-secondary text-white text-xs rounded-md opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 shadow-lg">
                    {item.label}
                  </div>
                )}
              </button>
            );
          })}
        </nav>

        {/* Back to site */}
        <div className="p-4 border-t border-white/10">
          <button
            onClick={onBack}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 text-sm transition-colors ${!sidebarOpen ? 'justify-center' : ''}`}
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {sidebarOpen && <span>Back to Site</span>}
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* ── Top Nav ── */}
        <header className="h-[72px] bg-white border-b border-border flex items-center justify-between px-6 shrink-0 shadow-sm z-20">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground"
            >
              <Menu className="w-5 h-5" />
            </button>
            {/* Search */}
            <div className="relative hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                placeholder="Search datasets, reports..."
                className="pl-10 pr-4 py-2 rounded-xl border border-border bg-muted/40 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary w-72"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Notifications */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setNotifOpen(!notifOpen)}
                className="relative w-9 h-9 rounded-xl flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground"
              >
                <Bell className="w-5 h-5" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full" />
              </button>
              {notifOpen && (
                <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-border py-2 z-50">
                  <div className="px-4 py-2 border-b border-border">
                    <p className="text-sm text-foreground">Notifications</p>
                  </div>
                  {[
                    { msg: 'GDP Indicators dataset updated', time: '2 min ago', dot: 'bg-primary' },
                    { msg: 'New API request from external user', time: '1 hr ago', dot: 'bg-blue-500' },
                    { msg: 'Export completed: Trade Balance', time: '3 hrs ago', dot: 'bg-green-500' },
                  ].map((n, i) => (
                    <div key={i} className="flex items-start gap-3 px-4 py-3 hover:bg-muted/50 cursor-pointer">
                      <span className={`mt-1.5 w-2 h-2 ${n.dot} rounded-full shrink-0`} />
                      <div>
                        <p className="text-sm">{n.msg}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{n.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Profile */}
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl hover:bg-muted transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-sm shrink-0">
                  A
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-sm text-foreground leading-none">Admin</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Super Admin</p>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
              {profileOpen && (
                <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-border py-2 z-50">
                  <div className="px-4 py-2 border-b border-border mb-1">
                    <p className="text-sm">Admin User</p>
                    <p className="text-xs text-muted-foreground">admin@laza.ao</p>
                  </div>
                  {['Profile', 'Settings', 'Help'].map((item) => (
                    <button key={item} className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-muted/60 transition-colors">
                      {item}
                    </button>
                  ))}
                  <div className="border-t border-border mt-1 pt-1">
                    <button onClick={onBack} className="w-full text-left px-4 py-2 text-sm text-primary hover:bg-muted/60 transition-colors">
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* ── Content ── */}
        <main className="flex-1 overflow-y-auto p-6">
          {/* Page Header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-foreground">Data Management</h1>
              <p className="text-sm text-muted-foreground mt-1">Manage datasets, sources and updates</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-white text-sm text-foreground hover:bg-muted/60 transition-colors shadow-sm">
                <Upload className="w-4 h-4" />
                Import CSV
              </button>
              <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-white text-sm text-foreground hover:bg-muted/60 transition-colors shadow-sm">
                <Download className="w-4 h-4" />
                Export
              </button>
              <button
                onClick={() => addToast('success', 'New dataset panel opened')}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm hover:bg-primary/90 transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Add Dataset
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-xl border border-border shadow-sm p-4 mb-5 flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search datasets..."
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-muted/30 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
              className="px-3 py-2 rounded-lg border border-border bg-muted/30 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              {categories.map((c) => <option key={c}>{c}</option>)}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="px-3 py-2 rounded-lg border border-border bg-muted/30 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option>All</option>
              <option>Active</option>
              <option>Draft</option>
            </select>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-muted/30 text-sm text-muted-foreground cursor-pointer hover:border-primary/40 transition-colors">
              <CalendarDays className="w-4 h-4" />
              <span>Date range</span>
            </div>
            <button
              onClick={() => { setSearch(''); setCategoryFilter('All'); setStatusFilter('All'); setPage(1); }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reset
            </button>
          </div>

          {/* Data Table */}
          <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  {['Dataset Name', 'Source', 'Category', 'Status', 'Last Updated', 'Owner', 'Actions'].map((col) => (
                    <th
                      key={col}
                      className={`px-5 py-3.5 text-left text-xs text-muted-foreground tracking-wide ${col === 'Actions' ? 'text-right' : ''}`}
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-sm text-muted-foreground">
                      <Filter className="w-8 h-8 mx-auto mb-2 text-border" />
                      No datasets match your filters.
                    </td>
                  </tr>
                ) : (
                  paginated.map((dataset) => (
                    <tr
                      key={dataset.id}
                      className="border-b border-border/50 hover:bg-muted/20 transition-colors group"
                    >
                      <td className="px-5 py-4">
                        <p className="text-sm text-foreground">{dataset.name}</p>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm text-muted-foreground">{dataset.source}</span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs border border-border bg-muted/40 text-muted-foreground">
                          {dataset.category}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs ${
                            dataset.status === 'Active'
                              ? 'bg-green-50 text-green-700 border border-green-100'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${dataset.status === 'Active' ? 'bg-green-500' : 'bg-slate-400'}`} />
                          {dataset.status}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm text-muted-foreground">{dataset.lastUpdated}</span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs">
                            {dataset.owner[0]}
                          </div>
                          <span className="text-sm text-muted-foreground">{dataset.owner}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => addToast('success', `Viewing ${dataset.name}`)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                            title="View"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setEditingDataset(dataset)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                            title="Edit"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(dataset.id)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {/* Pagination */}
            <div className="flex items-center justify-between px-5 py-4 border-t border-border">
              <p className="text-sm text-muted-foreground">
                Showing {filtered.length === 0 ? 0 : (page - 1) * rowsPerPage + 1}–
                {Math.min(page * rowsPerPage, filtered.length)} of {filtered.length} datasets
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="w-8 h-8 rounded-lg flex items-center justify-center border border-border text-muted-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-8 h-8 rounded-lg text-sm flex items-center justify-center border transition-colors ${
                      page === p
                        ? 'bg-primary text-white border-primary'
                        : 'border-border text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages || totalPages === 0}
                  className="w-8 h-8 rounded-lg flex items-center justify-center border border-border text-muted-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* ── Edit Drawer ── */}
      <EditDrawer
        dataset={editingDataset}
        onClose={() => setEditingDataset(null)}
        onSave={handleSave}
      />

      {/* ── Toasts ── */}
      <ToastNotification toasts={toasts} removeToast={removeToast} />
    </div>
  );
}
