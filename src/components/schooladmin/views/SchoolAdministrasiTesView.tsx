import React, { useState } from 'react';
import { tenantStore } from '../../../lib/supabase';
import { tkaStore } from '../../../lib/tkaStore';
import { ExamSession } from '../../../types/database';
import {
  MonitorCheck,
  KeyRound,
  Users,
  Activity,
  RotateCcw,
  ShieldCheck,
  Search,
  CheckCircle,
} from 'lucide-react';

interface SchoolAdministrasiTesViewProps {
  schoolId: string;
  subTab?: string;
}

export const SchoolAdministrasiTesView: React.FC<SchoolAdministrasiTesViewProps> = ({
  schoolId,
  subTab = 'token',
}) => {
  const [activeSubTab, setActiveSubTab] = useState<string>(subTab);
  const school = tenantStore.getSchoolById(schoolId);
  const students = tenantStore.getStudents(schoolId);
  const classes = tenantStore.getClasses(schoolId);
  const activeCenterToken = tkaStore.getActiveToken();
  const exams = tenantStore.getExams(schoolId);
  const schoolTokens = tenantStore.getTokens(schoolId).filter((t) => t.is_active);
  const [sessions, setSessions] = useState<ExamSession[]>(() => tenantStore.getSessions(schoolId));

  const [searchTerm, setSearchTerm] = useState('');
  const [tokenCopied, setTokenCopied] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleCopyToken = () => {
    if (!activeCenterToken.code) return;
    navigator.clipboard.writeText(activeCenterToken.code);
    setTokenCopied(true);
    setTimeout(() => setTokenCopied(false), 2000);
  };

  const handleResetLogin = (session: ExamSession) => {
    const updated: ExamSession = {
      ...session,
      status: 'in_progress',
      finished_at: undefined,
    };
    tenantStore.updateSession(updated);
    setSessions(tenantStore.getSessions(schoolId));
    showToast(`Status login peserta ${session.student_name || session.student_nisn || 'siswa'} berhasil di-reset.`);
  };

  const filteredSessions = sessions.filter((s) => {
    const name = (s.student_name || '').toLowerCase();
    const nisn = s.student_nisn || '';
    const q = searchTerm.toLowerCase();
    return name.includes(q) || nisn.includes(searchTerm);
  });

  return (
    <div className="space-y-5">
      {toastMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>
      )}

      {/* Scope Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-2xl p-5 shadow-sm border border-blue-800/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 border border-blue-400/30 rounded text-[10px] font-bold uppercase tracking-wider">
                Cakupan Data Sekolah Saya
              </span>
              <span className="text-slate-400 text-xs">•</span>
              <span className="text-xs text-blue-200 font-mono">NPSN: {school?.npsn || '-'}</span>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <MonitorCheck className="w-5 h-5 text-blue-400" />
              <span>Administrasi Tes • {school?.name || 'Satuan Pendidikan'}</span>
            </h1>
            <p className="text-xs text-blue-200 mt-1 max-w-2xl leading-relaxed">
              Menerima rilis token resmi dari Super Admin Pusat, melihat alokasi rombel tes, dan memantau sesi pengerjaan siswa{' '}
              <strong>{school?.name || 'sekolah Anda'}</strong>.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="px-3 py-1.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-semibold flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Sesi Mandiri</span>
            </span>
          </div>
        </div>
      </div>

      {/* Subtab Navigation */}
      <div className="bg-white rounded-xl border border-slate-200 p-1 flex flex-wrap gap-1 shadow-xs">
        <button
          onClick={() => setActiveSubTab('status')}
          className={`flex-1 min-w-[140px] px-3 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 ${
            activeSubTab === 'status'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <MonitorCheck className="w-3.5 h-3.5" />
          <span>Status Tes</span>
        </button>

        <button
          onClick={() => setActiveSubTab('token')}
          className={`flex-1 min-w-[140px] px-3 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 ${
            activeSubTab === 'token'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <KeyRound className="w-3.5 h-3.5" />
          <span>Rilis Token</span>
        </button>

        <button
          onClick={() => setActiveSubTab('kelompok')}
          className={`flex-1 min-w-[140px] px-3 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 ${
            activeSubTab === 'kelompok'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Kelompok Tes & Alokasi</span>
        </button>

        <button
          onClick={() => setActiveSubTab('monitor')}
          className={`flex-1 min-w-[140px] px-3 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 ${
            activeSubTab === 'monitor'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Live Monitoring Siswa</span>
        </button>
      </div>

      {/* 1. SUBTAB: STATUS TES */}
      {activeSubTab === 'status' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
          <div className="pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <MonitorCheck className="w-4 h-4 text-blue-600" />
              Paket & Status Sesi Ujian di {school?.name || 'Sekolah'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Jadwal pelaksanaan tes yang diaktifkan untuk peserta didik di sekolah ini
            </p>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase font-bold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Judul Ujian</th>
                  <th className="py-2.5 px-3">Mata Pelajaran</th>
                  <th className="py-2.5 px-3">Tingkat</th>
                  <th className="py-2.5 px-3">Durasi</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {exams.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      Belum ada paket ujian yang dijadwalkan untuk sekolah ini.
                    </td>
                  </tr>
                ) : (
                  exams.map((ex) => (
                    <tr key={ex.id} className="hover:bg-slate-50/80">
                      <td className="py-3 px-3 font-bold text-slate-900">{ex.title}</td>
                      <td className="py-3 px-3 text-slate-700">{ex.subject_name || '-'}</td>
                      <td className="py-3 px-3 text-slate-600">Kelas {ex.grade_level}</td>
                      <td className="py-3 px-3 text-slate-600">{ex.duration_minutes} Menit</td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800">
                          {ex.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. SUBTAB: RILIS TOKEN */}
      {activeSubTab === 'token' && (
        <div className="space-y-4">
          <div className="p-6 bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white rounded-2xl space-y-3 shadow-md border border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-300">
                Token Resmi dari Super Admin Pusat
              </span>
              <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 rounded-full text-[10px] font-mono border border-emerald-500/30">
                {activeCenterToken.code ? `Berlaku s/d ${activeCenterToken.validUntil}` : 'Belum Rilis'}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4">
              <div>
                <div className="font-mono text-4xl sm:text-5xl font-black text-yellow-300 tracking-widest">
                  {activeCenterToken.code || 'BELUM RILIS'}
                </div>
                <div className="text-xs text-slate-300 mt-1">
                  {activeCenterToken.code ? (
                    <>
                      Kode Tes: <strong className="text-white">{activeCenterToken.testCode}</strong> • Dirilis:{' '}
                      {activeCenterToken.releasedAt}
                    </>
                  ) : (
                    'Menunggu rilis token sesi dari Super Admin Pusat.'
                  )}
                </div>
              </div>

              <button
                onClick={handleCopyToken}
                disabled={!activeCenterToken.code}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-sm"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>{tokenCopied ? 'Tersalin!' : 'Salin Token'}</span>
              </button>
            </div>

            {schoolTokens.length > 0 && (
              <div className="pt-3 border-t border-slate-800/80 text-xs">
                <div className="text-[11px] font-semibold text-blue-200 mb-2">Token Sesi Aktif Sekolah:</div>
                <div className="flex flex-wrap gap-2">
                  {schoolTokens.map((tok) => (
                    <span
                      key={tok.id}
                      className="px-2.5 py-1 bg-white/10 border border-white/20 rounded-lg font-mono font-bold text-amber-300"
                    >
                      {tok.token_code}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. SUBTAB: KELOMPOK TES & ALOKASI */}
      {activeSubTab === 'kelompok' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
          <div className="pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600" />
              Kelompok Rombel & Alokasi Peserta ({school?.name || 'Sekolah'})
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Distribusi peserta didik berdasarkan rombongan belajar terdaftar di sekolah ini
            </p>
          </div>

          {classes.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
              Belum ada rombel kelas terdaftar. Tambahkan rombel di menu <strong>Data Master → Data Kelas</strong>.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {classes.map((cls) => {
                const count = students.filter((s) => s.class_id === cls.id).length;
                return (
                  <div key={cls.id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                    <div className="font-bold text-slate-900 text-sm">{cls.name}</div>
                    <p className="text-slate-500">Tingkat Kelas {cls.grade_level}</p>
                    <div className="text-blue-700 font-bold">Alokasi: {count} Siswa</div>
                    <span className="inline-block px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded text-[10px] font-bold border border-emerald-200">
                      Siap Sesi
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 4. SUBTAB: LIVE MONITORING SISWA */}
      {activeSubTab === 'monitor' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-600" />
                Live Monitoring Pengerjaan Siswa ({school?.name || 'Sekolah'})
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Pantau status sesi pengerjaan siswa dan reset login bila peserta terkendala perangkat
              </p>
            </div>
          </div>

          <div className="relative text-xs">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Cari siswa berdasarkan nama atau NISN..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white"
            />
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase font-bold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">NISN</th>
                  <th className="py-2.5 px-3">Nama Siswa</th>
                  <th className="py-2.5 px-3">Rombel</th>
                  <th className="py-2.5 px-3">Sisa Waktu</th>
                  <th className="py-2.5 px-3">Status Live</th>
                  <th className="py-2.5 px-3 text-center">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSessions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      Belum ada sesi pengerjaan ujian siswa yang aktif atau tercatat.
                    </td>
                  </tr>
                ) : (
                  filteredSessions.map((sess) => {
                    const minsLeft = Math.max(0, Math.ceil((sess.remaining_seconds || 0) / 60));
                    return (
                      <tr key={sess.id} className="hover:bg-slate-50/80">
                        <td className="py-2.5 px-3 font-mono text-slate-600">{sess.student_nisn || '-'}</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-900">{sess.student_name || 'Peserta'}</td>
                        <td className="py-2.5 px-3 text-slate-600">{sess.class_name || '-'}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-600">
                          {sess.status === 'submitted' || sess.status === 'graded'
                            ? 'Selesai'
                            : `${minsLeft} Menit`}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              sess.status === 'submitted' || sess.status === 'graded'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : sess.status === 'in_progress'
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : 'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}
                          >
                            {sess.status === 'submitted'
                              ? 'Selesai'
                              : sess.status === 'graded'
                              ? 'Dinilai'
                              : sess.status === 'in_progress'
                              ? 'Mengerjakan'
                              : 'Belum Mulai'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            onClick={() => handleResetLogin(sess)}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-amber-50 text-slate-700 hover:text-amber-800 rounded-lg text-[11px] font-semibold flex items-center gap-1 mx-auto transition"
                            title="Reset sesi login jika siswa mengalami kendala browser"
                          >
                            <RotateCcw className="w-3 h-3 text-amber-600" />
                            <span>Reset Login</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
