import React, { useState, useEffect } from 'react';
import { tkaStore } from '../../../lib/tkaStore';
import { tenantStore } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { ExamTypeItem, ExamConfiguration, ExamPeriod } from '../../../types/tka';
import {
  ClipboardList,
  Tag,
  Sliders,
  CalendarRange,
  Plus,
  Pencil,
  Trash2,
  Search,
  CheckCircle,
  AlertTriangle,
  X,
  Clock,
  ShieldCheck,
  Shuffle,
  KeyRound,
  Eye,
  MonitorCheck,
} from 'lucide-react';

interface TkaManajemenUjianViewProps {
  subTab?: string;
  onNavigate?: (sub: string) => void;
}

export const TkaManajemenUjianView: React.FC<TkaManajemenUjianViewProps> = ({
  subTab = 'jenis_ujian',
  onNavigate,
}) => {
  const { user } = useAuth();

  const normalizeSubTab = (tab?: string) => {
    if (tab === 'konfigurasi_ujian' || tab === 'konfigurasi') return 'konfigurasi_ujian';
    if (tab === 'periode_ujian' || tab === 'periode') return 'periode_ujian';
    return 'jenis_ujian';
  };

  const [activeSubTab, setActiveSubTab] = useState<string>(normalizeSubTab(subTab));

  useEffect(() => {
    setActiveSubTab(normalizeSubTab(subTab));
  }, [subTab]);

  const handleSubTabChange = (tab: string) => {
    setActiveSubTab(tab);
    if (onNavigate) onNavigate(tab);
  };

  // Persistent State
  const [examTypes, setExamTypes] = useState<ExamTypeItem[]>(() => tkaStore.getExamTypes());
  const [examConfigs, setExamConfigs] = useState<ExamConfiguration[]>(() => tkaStore.getExamConfigs());
  const [examPeriods, setExamPeriods] = useState<ExamPeriod[]>(() => tkaStore.getExamPeriods());

  // Feedback Toast & Delete Confirmation Modal
  const [toast, setToast] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    kind: 'type' | 'config' | 'period';
    id: string;
    label: string;
  } | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const logAction = (action: string, entityType: string, entityId: string, details: Record<string, any>) => {
    tenantStore.addAuditLog({
      school_id: null,
      user_id: user?.id || '20000000-0000-4000-8000-000000000001',
      user_role: 'super_admin',
      user_email: user?.email || 'admin@kemdikbud.edujian.id',
      action,
      entity_type: entityType,
      entity_id: entityId,
      details,
    });
  };

  // =========================================================================
  // SUBTAB 1: JENIS UJIAN
  // =========================================================================
  const [typeSearch, setTypeSearch] = useState('');
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [editingType, setEditingType] = useState<ExamTypeItem | null>(null);
  const [typeForm, setTypeForm] = useState({
    code: '',
    name: '',
    description: '',
    default_duration_minutes: 90,
    default_passing_grade: 75,
    is_active: true,
  });

  const openAddType = () => {
    setEditingType(null);
    setTypeForm({
      code: '',
      name: '',
      description: '',
      default_duration_minutes: 90,
      default_passing_grade: 75,
      is_active: true,
    });
    setShowTypeModal(true);
  };

  const openEditType = (item: ExamTypeItem) => {
    setEditingType(item);
    setTypeForm({
      code: item.code,
      name: item.name,
      description: item.description || '',
      default_duration_minutes: item.default_duration_minutes,
      default_passing_grade: item.default_passing_grade,
      is_active: item.is_active,
    });
    setShowTypeModal(true);
  };

  const handleSaveType = (e: React.FormEvent) => {
    e.preventDefault();
    if (!typeForm.code.trim() || !typeForm.name.trim()) return;

    if (editingType) {
      tkaStore.updateExamType(editingType.id, {
        code: typeForm.code.trim().toUpperCase(),
        name: typeForm.name.trim(),
        description: typeForm.description.trim(),
        default_duration_minutes: Number(typeForm.default_duration_minutes) || 60,
        default_passing_grade: Number(typeForm.default_passing_grade) || 75,
        is_active: typeForm.is_active,
      });
      logAction('UPDATE_EXAM_TYPE', 'EXAM_TYPE', editingType.id, { name: typeForm.name.trim() });
      showToast(`Jenis ujian "${typeForm.name.trim()}" berhasil diperbarui.`);
    } else {
      const created = tkaStore.addExamType({
        code: typeForm.code.trim().toUpperCase(),
        name: typeForm.name.trim(),
        description: typeForm.description.trim(),
        default_duration_minutes: Number(typeForm.default_duration_minutes) || 60,
        default_passing_grade: Number(typeForm.default_passing_grade) || 75,
        is_active: typeForm.is_active,
      });
      logAction('CREATE_EXAM_TYPE', 'EXAM_TYPE', created.id, { code: created.code, name: created.name });
      showToast(`Jenis ujian "${created.name}" berhasil ditambahkan.`);
    }
    setExamTypes(tkaStore.getExamTypes());
    setShowTypeModal(false);
  };

  const handleToggleTypeActive = (item: ExamTypeItem) => {
    tkaStore.updateExamType(item.id, { is_active: !item.is_active });
    setExamTypes(tkaStore.getExamTypes());
    showToast(`Jenis ujian "${item.name}" diubah menjadi ${!item.is_active ? 'Aktif' : 'Nonaktif'}.`);
  };

  const filteredTypes = examTypes.filter(
    (t) =>
      t.name.toLowerCase().includes(typeSearch.toLowerCase()) ||
      t.code.toLowerCase().includes(typeSearch.toLowerCase())
  );

  // =========================================================================
  // SUBTAB 2: KONFIGURASI UJIAN
  // =========================================================================
  const [configSearch, setConfigSearch] = useState('');
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [editingConfig, setEditingConfig] = useState<ExamConfiguration | null>(null);
  const [configForm, setConfigForm] = useState({
    exam_type_id: '',
    title: '',
    duration_minutes: 90,
    passing_grade: 75,
    randomize_questions: true,
    randomize_options: true,
    require_token: true,
    show_result_to_student: false,
    strict_fullscreen: true,
    max_violations: 3,
    is_active: true,
  });

  const openAddConfig = () => {
    const firstType = examTypes[0];
    setEditingConfig(null);
    setConfigForm({
      exam_type_id: firstType?.id || '',
      title: '',
      duration_minutes: firstType?.default_duration_minutes || 90,
      passing_grade: firstType?.default_passing_grade || 75,
      randomize_questions: true,
      randomize_options: true,
      require_token: true,
      show_result_to_student: false,
      strict_fullscreen: true,
      max_violations: 3,
      is_active: true,
    });
    setShowConfigModal(true);
  };

  const openEditConfig = (cfg: ExamConfiguration) => {
    setEditingConfig(cfg);
    setConfigForm({
      exam_type_id: cfg.exam_type_id,
      title: cfg.title,
      duration_minutes: cfg.duration_minutes,
      passing_grade: cfg.passing_grade,
      randomize_questions: cfg.randomize_questions,
      randomize_options: cfg.randomize_options,
      require_token: cfg.require_token,
      show_result_to_student: cfg.show_result_to_student,
      strict_fullscreen: cfg.strict_fullscreen,
      max_violations: cfg.max_violations,
      is_active: cfg.is_active,
    });
    setShowConfigModal(true);
  };

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!configForm.title.trim()) return;
    const matchedType = examTypes.find((t) => t.id === configForm.exam_type_id);

    if (editingConfig) {
      tkaStore.updateExamConfig(editingConfig.id, {
        ...configForm,
        title: configForm.title.trim(),
        exam_type_name: matchedType?.name || editingConfig.exam_type_name || 'Umum',
        duration_minutes: Number(configForm.duration_minutes) || 60,
        passing_grade: Number(configForm.passing_grade) || 75,
        max_violations: Number(configForm.max_violations) || 0,
      });
      logAction('UPDATE_EXAM_CONFIG', 'EXAM_CONFIG', editingConfig.id, { title: configForm.title.trim() });
      showToast(`Konfigurasi "${configForm.title.trim()}" berhasil diperbarui.`);
    } else {
      const created = tkaStore.addExamConfig({
        ...configForm,
        title: configForm.title.trim(),
        exam_type_name: matchedType?.name || 'Umum',
        duration_minutes: Number(configForm.duration_minutes) || 60,
        passing_grade: Number(configForm.passing_grade) || 75,
        max_violations: Number(configForm.max_violations) || 0,
      });
      logAction('CREATE_EXAM_CONFIG', 'EXAM_CONFIG', created.id, { title: created.title });
      showToast(`Konfigurasi "${created.title}" berhasil disimpan.`);
    }
    setExamConfigs(tkaStore.getExamConfigs());
    setShowConfigModal(false);
  };

  const filteredConfigs = examConfigs.filter(
    (c) =>
      c.title.toLowerCase().includes(configSearch.toLowerCase()) ||
      (c.exam_type_name || '').toLowerCase().includes(configSearch.toLowerCase())
  );

  // =========================================================================
  // SUBTAB 3: PERIODE UJIAN
  // =========================================================================
  const [periodSearch, setPeriodSearch] = useState('');
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState<ExamPeriod | null>(null);
  const [periodForm, setPeriodForm] = useState({
    name: '',
    academic_year: '2025/2026',
    semester: 'Genap' as 'Ganjil' | 'Genap',
    exam_type_id: '',
    start_date: '',
    end_date: '',
    status: 'upcoming' as 'upcoming' | 'active' | 'closed',
    notes: '',
  });

  const openAddPeriod = () => {
    setEditingPeriod(null);
    setPeriodForm({
      name: '',
      academic_year: '2025/2026',
      semester: 'Genap',
      exam_type_id: examTypes[0]?.id || '',
      start_date: '',
      end_date: '',
      status: 'upcoming',
      notes: '',
    });
    setShowPeriodModal(true);
  };

  const openEditPeriod = (p: ExamPeriod) => {
    setEditingPeriod(p);
    setPeriodForm({
      name: p.name,
      academic_year: p.academic_year,
      semester: p.semester,
      exam_type_id: p.exam_type_id,
      start_date: p.start_date,
      end_date: p.end_date,
      status: p.status,
      notes: p.notes || '',
    });
    setShowPeriodModal(true);
  };

  const handleSavePeriod = (e: React.FormEvent) => {
    e.preventDefault();
    if (!periodForm.name.trim() || !periodForm.start_date || !periodForm.end_date) return;
    const matchedType = examTypes.find((t) => t.id === periodForm.exam_type_id);

    if (editingPeriod) {
      tkaStore.updateExamPeriod(editingPeriod.id, {
        ...periodForm,
        name: periodForm.name.trim(),
        exam_type_name: matchedType?.name || editingPeriod.exam_type_name || 'Umum',
        notes: periodForm.notes.trim(),
      });
      logAction('UPDATE_EXAM_PERIOD', 'EXAM_PERIOD', editingPeriod.id, { name: periodForm.name.trim() });
      showToast(`Periode ujian "${periodForm.name.trim()}" berhasil diperbarui.`);
    } else {
      const created = tkaStore.addExamPeriod({
        ...periodForm,
        name: periodForm.name.trim(),
        exam_type_name: matchedType?.name || 'Umum',
        notes: periodForm.notes.trim(),
      });
      logAction('CREATE_EXAM_PERIOD', 'EXAM_PERIOD', created.id, { name: created.name });
      showToast(`Periode ujian "${created.name}" berhasil ditambahkan.`);
    }
    setExamPeriods(tkaStore.getExamPeriods());
    setShowPeriodModal(false);
  };

  const filteredPeriods = examPeriods.filter(
    (p) =>
      p.name.toLowerCase().includes(periodSearch.toLowerCase()) ||
      p.academic_year.toLowerCase().includes(periodSearch.toLowerCase()) ||
      (p.exam_type_name || '').toLowerCase().includes(periodSearch.toLowerCase())
  );

  // Confirm delete handler
  const handleConfirmDelete = () => {
    if (!deleteConfirm) return;
    if (deleteConfirm.kind === 'type') {
      tkaStore.deleteExamType(deleteConfirm.id);
      setExamTypes(tkaStore.getExamTypes());
      logAction('DELETE_EXAM_TYPE', 'EXAM_TYPE', deleteConfirm.id, { label: deleteConfirm.label });
    } else if (deleteConfirm.kind === 'config') {
      tkaStore.deleteExamConfig(deleteConfirm.id);
      setExamConfigs(tkaStore.getExamConfigs());
      logAction('DELETE_EXAM_CONFIG', 'EXAM_CONFIG', deleteConfirm.id, { label: deleteConfirm.label });
    } else if (deleteConfirm.kind === 'period') {
      tkaStore.deleteExamPeriod(deleteConfirm.id);
      setExamPeriods(tkaStore.getExamPeriods());
      logAction('DELETE_EXAM_PERIOD', 'EXAM_PERIOD', deleteConfirm.id, { label: deleteConfirm.label });
    }
    showToast(`"${deleteConfirm.label}" berhasil dihapus.`);
    setDeleteConfirm(null);
  };

  return (
    <div className="space-y-4">
      {/* Toast Feedback */}
      {toast && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{toast}</span>
          </div>
          <button onClick={() => setToast(null)} className="text-slate-400 hover:text-slate-600">
            ✕
          </button>
        </div>
      )}

      {/* Top Header & Subtab Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span className="w-2.5 h-6 bg-blue-600 rounded-full inline-block"></span>
            Manajemen Ujian Nasional SINTESA
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Pengaturan jenis asesmen, parameter konfigurasi ujian, serta periode pelaksanaan ujian nasional
          </p>
        </div>

        {/* Submenu Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar p-1 bg-slate-100/80 rounded-xl border border-slate-200/60">
          <button
            onClick={() => handleSubTabChange('jenis_ujian')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
              activeSubTab === 'jenis_ujian'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            <span>Jenis Ujian ({examTypes.length})</span>
          </button>

          <button
            onClick={() => handleSubTabChange('konfigurasi_ujian')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
              activeSubTab === 'konfigurasi_ujian'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Konfigurasi Ujian ({examConfigs.length})</span>
          </button>

          <button
            onClick={() => handleSubTabChange('periode_ujian')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
              activeSubTab === 'periode_ujian'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
            }`}
          >
            <CalendarRange className="w-3.5 h-3.5" />
            <span>Periode Ujian ({examPeriods.length})</span>
          </button>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* SUBTAB 1: JENIS UJIAN                                                 */}
      {/* ===================================================================== */}
      {activeSubTab === 'jenis_ujian' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <div className="text-[11px] font-bold text-slate-500 uppercase">Total Jenis Ujian</div>
              <div className="text-2xl font-black text-slate-900 mt-1">{examTypes.length}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Kategori asesmen terdaftar</div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <div className="text-[11px] font-bold text-emerald-600 uppercase">Jenis Ujian Aktif</div>
              <div className="text-2xl font-black text-emerald-700 mt-1">
                {examTypes.filter((t) => t.is_active).length}
              </div>
              <div className="text-[10px] text-emerald-600 mt-0.5">Tersedia untuk dipilih di konfigurasi</div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <div className="text-[11px] font-bold text-slate-500 uppercase">Nonaktif</div>
              <div className="text-2xl font-black text-slate-700 mt-1">
                {examTypes.filter((t) => !t.is_active).length}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Diarsipkan sementara</div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-sm text-xs">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Cari kode atau nama jenis ujian..."
                  value={typeSearch}
                  onChange={(e) => setTypeSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <button
                onClick={openAddType}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Jenis Ujian</span>
              </button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 uppercase font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Kode</th>
                    <th className="py-2.5 px-3">Nama Jenis Ujian</th>
                    <th className="py-2.5 px-3">Durasi Default</th>
                    <th className="py-2.5 px-3">KKM Default</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTypes.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-slate-400">
                        <ClipboardList className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                        Belum ada jenis ujian yang ditambahkan. Klik &quot;Tambah Jenis Ujian&quot; untuk memulai.
                      </td>
                    </tr>
                  ) : (
                    filteredTypes.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/80">
                        <td className="py-3 px-3 font-mono font-bold text-blue-700">{item.code}</td>
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-900">{item.name}</div>
                          {item.description && (
                            <div className="text-[11px] text-slate-500 mt-0.5">{item.description}</div>
                          )}
                        </td>
                        <td className="py-3 px-3 text-slate-700">{item.default_duration_minutes} Menit</td>
                        <td className="py-3 px-3 font-semibold text-slate-800">{item.default_passing_grade}</td>
                        <td className="py-3 px-3">
                          <button
                            onClick={() => handleToggleTypeActive(item)}
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border transition ${
                              item.is_active
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                            }`}
                          >
                            {item.is_active ? 'Aktif' : 'Nonaktif'}
                          </button>
                        </td>
                        <td className="py-3 px-3 text-right space-x-1">
                          <button
                            onClick={() => openEditType(item)}
                            className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="Edit Jenis Ujian"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm({ kind: 'type', id: item.id, label: item.name })}
                            className="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            title="Hapus Jenis Ujian"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* SUBTAB 2: KONFIGURASI UJIAN                                           */}
      {/* ===================================================================== */}
      {activeSubTab === 'konfigurasi_ujian' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <div className="text-[11px] font-bold text-slate-500 uppercase">Total Konfigurasi</div>
              <div className="text-2xl font-black text-slate-900 mt-1">{examConfigs.length}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Profil aturan ujian</div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <div className="text-[11px] font-bold text-emerald-600 uppercase">Konfigurasi Aktif</div>
              <div className="text-2xl font-black text-emerald-700 mt-1">
                {examConfigs.filter((c) => c.is_active).length}
              </div>
              <div className="text-[10px] text-emerald-600 mt-0.5">Siap diterapkan pada sesi ujian</div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <div className="text-[11px] font-bold text-blue-600 uppercase">Mode Pengawasan Ketat</div>
              <div className="text-2xl font-black text-blue-700 mt-1">
                {examConfigs.filter((c) => c.strict_fullscreen).length}
              </div>
              <div className="text-[10px] text-blue-600 mt-0.5">Fullscreen & batas pelanggaran aktif</div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-sm text-xs">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Cari nama konfigurasi atau jenis ujian..."
                  value={configSearch}
                  onChange={(e) => setConfigSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <button
                onClick={openAddConfig}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Konfigurasi Ujian</span>
              </button>
            </div>

            {filteredConfigs.length === 0 ? (
              <div className="p-10 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
                <Sliders className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                Belum ada konfigurasi ujian. Klik &quot;Tambah Konfigurasi Ujian&quot; untuk mengatur parameter tes.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {filteredConfigs.map((cfg) => (
                  <div
                    key={cfg.id}
                    className="p-4 bg-slate-50/70 border border-slate-200 rounded-xl space-y-3 hover:border-blue-300 transition"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-bold">
                          {cfg.exam_type_name || 'Umum'}
                        </span>
                        <h3 className="text-sm font-bold text-slate-900 mt-1">{cfg.title}</h3>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          cfg.is_active
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {cfg.is_active ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 p-2.5 bg-white border border-slate-200 rounded-lg text-[11px]">
                      <div className="flex items-center gap-1.5 text-slate-700">
                        <Clock className="w-3.5 h-3.5 text-blue-600" />
                        <span>Durasi: <strong>{cfg.duration_minutes} Menit</strong></span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-700">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        <span>KKM: <strong>{cfg.passing_grade}</strong></span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-700">
                        <Shuffle className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Acak Soal: <strong>{cfg.randomize_questions ? 'Ya' : 'Tidak'}</strong></span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-700">
                        <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                        <span>Wajib Token: <strong>{cfg.require_token ? 'Ya' : 'Tidak'}</strong></span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-700">
                        <MonitorCheck className="w-3.5 h-3.5 text-rose-600" />
                        <span>
                          Fullscreen: <strong>{cfg.strict_fullscreen ? `Maks ${cfg.max_violations}x` : 'Nonaktif'}</strong>
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-700">
                        <Eye className="w-3.5 h-3.5 text-slate-600" />
                        <span>Tampil Nilai: <strong>{cfg.show_result_to_student ? 'Ya' : 'Tidak'}</strong></span>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        onClick={() => openEditConfig(cfg)}
                        className="px-3 py-1.5 bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 rounded-lg font-semibold flex items-center gap-1 transition"
                      >
                        <Pencil className="w-3 h-3" />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => setDeleteConfirm({ kind: 'config', id: cfg.id, label: cfg.title })}
                        className="px-3 py-1.5 bg-white hover:bg-rose-50 text-rose-600 border border-slate-200 rounded-lg font-semibold flex items-center gap-1 transition"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Hapus</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* SUBTAB 3: PERIODE UJIAN                                               */}
      {/* ===================================================================== */}
      {activeSubTab === 'periode_ujian' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <div className="text-[11px] font-bold text-slate-500 uppercase">Total Periode</div>
              <div className="text-2xl font-black text-slate-900 mt-1">{examPeriods.length}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Jadwal periode terdaftar</div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <div className="text-[11px] font-bold text-emerald-600 uppercase">Periode Aktif</div>
              <div className="text-2xl font-black text-emerald-700 mt-1">
                {examPeriods.filter((p) => p.status === 'active').length}
              </div>
              <div className="text-[10px] text-emerald-600 mt-0.5">Sedang berlangsung</div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <div className="text-[11px] font-bold text-amber-600 uppercase">Akan Datang</div>
              <div className="text-2xl font-black text-amber-700 mt-1">
                {examPeriods.filter((p) => p.status === 'upcoming').length}
              </div>
              <div className="text-[10px] text-amber-600 mt-0.5">Terjadwal berikutnya</div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-sm text-xs">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Cari nama periode, tahun ajaran, atau jenis..."
                  value={periodSearch}
                  onChange={(e) => setPeriodSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <button
                onClick={openAddPeriod}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Periode Ujian</span>
              </button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 uppercase font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Nama Periode</th>
                    <th className="py-2.5 px-3">Tahun Ajaran / Semester</th>
                    <th className="py-2.5 px-3">Jenis Ujian</th>
                    <th className="py-2.5 px-3">Rentang Tanggal</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPeriods.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-slate-400">
                        <CalendarRange className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                        Belum ada periode ujian. Klik &quot;Tambah Periode Ujian&quot; untuk menjadwalkan periode.
                      </td>
                    </tr>
                  ) : (
                    filteredPeriods.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/80">
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-900">{p.name}</div>
                          {p.notes && <div className="text-[11px] text-slate-500 mt-0.5">{p.notes}</div>}
                        </td>
                        <td className="py-3 px-3 text-slate-700">
                          <span className="font-semibold">{p.academic_year}</span> • Semester {p.semester}
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded text-[10px] font-bold">
                            {p.exam_type_name || 'Umum'}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-700">
                          {p.start_date} s/d {p.end_date}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              p.status === 'active'
                                ? 'bg-emerald-100 text-emerald-800'
                                : p.status === 'upcoming'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            {p.status === 'active'
                              ? 'Aktif Berjalan'
                              : p.status === 'upcoming'
                              ? 'Akan Datang'
                              : 'Ditutup'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right space-x-1">
                          <button
                            onClick={() => openEditPeriod(p)}
                            className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="Edit Periode Ujian"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm({ kind: 'period', id: p.id, label: p.name })}
                            className="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            title="Hapus Periode Ujian"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 1: ADD / EDIT JENIS UJIAN                                       */}
      {/* ===================================================================== */}
      {showTypeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <form
            onSubmit={handleSaveType}
            className="bg-white rounded-2xl max-w-md w-full p-6 text-slate-800 space-y-4 text-xs shadow-2xl"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Tag className="w-4 h-4 text-blue-600" />
                <span>{editingType ? 'Edit Jenis Ujian' : 'Tambah Jenis Ujian'}</span>
              </h3>
              <button type="button" onClick={() => setShowTypeModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Kode Jenis Ujian *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: TKA-SD / SAS / PTS"
                  value={typeForm.code}
                  onChange={(e) => setTypeForm({ ...typeForm, code: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono uppercase focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nama Jenis Ujian *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Tes Kemampuan Akademik SD"
                  value={typeForm.name}
                  onChange={(e) => setTypeForm({ ...typeForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Durasi Default (Menit)</label>
                  <input
                    type="number"
                    min={10}
                    max={300}
                    value={typeForm.default_duration_minutes}
                    onChange={(e) =>
                      setTypeForm({ ...typeForm, default_duration_minutes: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">KKM Default</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={typeForm.default_passing_grade}
                    onChange={(e) =>
                      setTypeForm({ ...typeForm, default_passing_grade: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Deskripsi (Opsional)</label>
                <textarea
                  rows={2}
                  placeholder="Keterangan singkat jenis asesmen..."
                  value={typeForm.description}
                  onChange={(e) => setTypeForm({ ...typeForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <label className="flex items-center gap-2 font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={typeForm.is_active}
                  onChange={(e) => setTypeForm({ ...typeForm, is_active: e.target.checked })}
                  className="rounded border-slate-300 text-blue-600"
                />
                <span>Aktifkan Jenis Ujian ini</span>
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowTypeModal(false)}
                className="px-3.5 py-1.5 border border-slate-300 rounded-lg text-slate-700 font-semibold"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold"
              >
                Simpan
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 2: ADD / EDIT KONFIGURASI UJIAN                                 */}
      {/* ===================================================================== */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <form
            onSubmit={handleSaveConfig}
            className="bg-white rounded-2xl max-w-lg w-full p-6 text-slate-800 space-y-4 text-xs shadow-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-blue-600" />
                <span>{editingConfig ? 'Edit Konfigurasi Ujian' : 'Tambah Konfigurasi Ujian'}</span>
              </h3>
              <button type="button" onClick={() => setShowConfigModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nama Profil Konfigurasi *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Konfigurasi Standar TKA Utama 2026"
                  value={configForm.title}
                  onChange={(e) => setConfigForm({ ...configForm, title: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Jenis Ujian Terkait</label>
                <select
                  value={configForm.exam_type_id}
                  onChange={(e) => setConfigForm({ ...configForm, exam_type_id: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                >
                  <option value="">Umum (Semua Jenis Ujian)</option>
                  {examTypes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.code} — {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Durasi (Menit)</label>
                  <input
                    type="number"
                    min={10}
                    max={300}
                    value={configForm.duration_minutes}
                    onChange={(e) =>
                      setConfigForm({ ...configForm, duration_minutes: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">KKM</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={configForm.passing_grade}
                    onChange={(e) =>
                      setConfigForm({ ...configForm, passing_grade: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Maks. Pelanggaran</label>
                  <input
                    type="number"
                    min={0}
                    max={20}
                    value={configForm.max_violations}
                    onChange={(e) =>
                      setConfigForm({ ...configForm, max_violations: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="font-bold text-slate-800 text-[11px] uppercase">Parameter Pelaksanaan</div>
                <label className="flex items-center gap-2 text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={configForm.randomize_questions}
                    onChange={(e) => setConfigForm({ ...configForm, randomize_questions: e.target.checked })}
                  />
                  <span>Acak urutan butir soal untuk setiap peserta</span>
                </label>
                <label className="flex items-center gap-2 text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={configForm.randomize_options}
                    onChange={(e) => setConfigForm({ ...configForm, randomize_options: e.target.checked })}
                  />
                  <span>Acak urutan pilihan jawaban (A/B/C/D)</span>
                </label>
                <label className="flex items-center gap-2 text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={configForm.require_token}
                    onChange={(e) => setConfigForm({ ...configForm, require_token: e.target.checked })}
                  />
                  <span>Wajibkan validasi Token Sesi saat siswa masuk ujian</span>
                </label>
                <label className="flex items-center gap-2 text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={configForm.strict_fullscreen}
                    onChange={(e) => setConfigForm({ ...configForm, strict_fullscreen: e.target.checked })}
                  />
                  <span>Aktifkan pengawasan layar penuh (anti pindah tab)</span>
                </label>
                <label className="flex items-center gap-2 text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={configForm.show_result_to_student}
                    onChange={(e) => setConfigForm({ ...configForm, show_result_to_student: e.target.checked })}
                  />
                  <span>Tampilkan nilai langsung kepada siswa setelah selesai</span>
                </label>
                <label className="flex items-center gap-2 text-slate-700 cursor-pointer pt-1 border-t border-slate-200">
                  <input
                    type="checkbox"
                    checked={configForm.is_active}
                    onChange={(e) => setConfigForm({ ...configForm, is_active: e.target.checked })}
                  />
                  <span className="font-semibold">Status Konfigurasi Aktif</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                className="px-3.5 py-1.5 border border-slate-300 rounded-lg text-slate-700 font-semibold"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold"
              >
                Simpan Konfigurasi
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 3: ADD / EDIT PERIODE UJIAN                                     */}
      {/* ===================================================================== */}
      {showPeriodModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <form
            onSubmit={handleSavePeriod}
            className="bg-white rounded-2xl max-w-md w-full p-6 text-slate-800 space-y-4 text-xs shadow-2xl"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <CalendarRange className="w-4 h-4 text-blue-600" />
                <span>{editingPeriod ? 'Edit Periode Ujian' : 'Tambah Periode Ujian'}</span>
              </h3>
              <button type="button" onClick={() => setShowPeriodModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nama Periode Ujian *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Pelaksanaan Utama Semester Genap"
                  value={periodForm.name}
                  onChange={(e) => setPeriodForm({ ...periodForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tahun Ajaran *</label>
                  <input
                    type="text"
                    required
                    placeholder="2025/2026"
                    value={periodForm.academic_year}
                    onChange={(e) => setPeriodForm({ ...periodForm, academic_year: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Semester *</label>
                  <select
                    value={periodForm.semester}
                    onChange={(e) =>
                      setPeriodForm({ ...periodForm, semester: e.target.value as 'Ganjil' | 'Genap' })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="Ganjil">Ganjil</option>
                    <option value="Genap">Genap</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Jenis Ujian</label>
                <select
                  value={periodForm.exam_type_id}
                  onChange={(e) => setPeriodForm({ ...periodForm, exam_type_id: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                >
                  <option value="">Umum (Semua Jenis Ujian)</option>
                  {examTypes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.code} — {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tanggal Mulai *</label>
                  <input
                    type="date"
                    required
                    value={periodForm.start_date}
                    onChange={(e) => setPeriodForm({ ...periodForm, start_date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tanggal Selesai *</label>
                  <input
                    type="date"
                    required
                    value={periodForm.end_date}
                    onChange={(e) => setPeriodForm({ ...periodForm, end_date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Status Periode</label>
                <select
                  value={periodForm.status}
                  onChange={(e) =>
                    setPeriodForm({
                      ...periodForm,
                      status: e.target.value as 'upcoming' | 'active' | 'closed',
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                >
                  <option value="upcoming">Akan Datang</option>
                  <option value="active">Aktif Berjalan</option>
                  <option value="closed">Ditutup</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Catatan (Opsional)</label>
                <textarea
                  rows={2}
                  placeholder="Informasi tambahan mengenai pelaksanaan periode ini..."
                  value={periodForm.notes}
                  onChange={(e) => setPeriodForm({ ...periodForm, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowPeriodModal(false)}
                className="px-3.5 py-1.5 border border-slate-300 rounded-lg text-slate-700 font-semibold"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold"
              >
                Simpan Periode
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL KONFIRMASI HAPUS                                                */}
      {/* ===================================================================== */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 text-slate-800 space-y-4 text-xs shadow-2xl">
            <div className="flex items-center gap-2.5 text-rose-600">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h3 className="font-bold text-sm text-slate-900">Konfirmasi Penghapusan</h3>
            </div>
            <p className="text-slate-600 leading-relaxed">
              Apakah Anda yakin ingin menghapus <strong>{deleteConfirm.label}</strong>? Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-3.5 py-1.5 border border-slate-300 rounded-lg text-slate-700 font-semibold"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
