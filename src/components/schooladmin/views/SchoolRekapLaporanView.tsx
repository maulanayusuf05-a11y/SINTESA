import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { tenantStore } from '../../../lib/supabase';
import { TutWuriLogo } from '../../common/TutWuriLogo';
import {
  BarChart2,
  CheckCircle,
  FileSpreadsheet,
  FileText,
  Printer,
  ShieldCheck,
  Users,
} from 'lucide-react';

interface SchoolRekapLaporanViewProps {
  schoolId: string;
  subTab?: string;
}

export const SchoolRekapLaporanView: React.FC<SchoolRekapLaporanViewProps> = ({
  schoolId,
  subTab = 'kehadiran',
}) => {
  const [activeSubTab, setActiveSubTab] = useState<string>(subTab);
  const school = tenantStore.getSchoolById(schoolId);
  const students = tenantStore.getStudents(schoolId);
  const sessions = tenantStore.getSessions(schoolId);
  const proctors = tenantStore.getProctors(schoolId);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Real attendance and score computation from exam sessions
  const studentRows = students.map((st) => {
    const sess = sessions.find(
      (s) => s.student_id === st.id || (s.student_nisn && s.student_nisn === st.nisn)
    );
    const hasAttended =
      sess && (sess.status === 'in_progress' || sess.status === 'submitted' || sess.status === 'graded');
    const score = typeof sess?.score === 'number' ? sess.score : null;
    return {
      ...st,
      sessionStatus: sess?.status || 'not_started',
      statusKehadiran: hasAttended ? 'Hadir' : 'Belum Hadir',
      score,
    };
  });

  const totalHadir = studentRows.filter((s) => s.statusKehadiran === 'Hadir').length;
  const totalSelesai = studentRows.filter(
    (s) => s.sessionStatus === 'submitted' || s.sessionStatus === 'graded'
  ).length;
  const totalBelumHadir = Math.max(0, students.length - totalHadir);
  const attendancePct = students.length > 0 ? Math.round((totalHadir / students.length) * 100) : 0;

  const gradedRows = studentRows.filter((r) => typeof r.score === 'number');
  const avgScore =
    gradedRows.length > 0
      ? (gradedRows.reduce((acc, r) => acc + (r.score || 0), 0) / gradedRows.length).toFixed(1)
      : '-';

  const todayFormatted = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const handleExportExcel = () => {
    const rows = studentRows.map((st, idx) => [
      idx + 1,
      st.nisn,
      st.full_name,
      st.class_name || '-',
      st.statusKehadiran,
      st.score !== null ? st.score : '-',
      st.score !== null ? (st.score >= 85 ? 'Mahir' : st.score >= 70 ? 'Cakap' : 'Perlu Bimbingan') : '-',
    ]);

    const sheetData = [
      ['No', 'NISN', 'Nama Lengkap Siswa', 'Rombel', 'Kehadiran', 'Nilai', 'Predikat'],
      ...(rows.length > 0 ? rows : [['-', '-', 'Belum ada data siswa terdaftar', '-', '-', '-', '-']]),
    ];

    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    ws['!cols'] = [{ wch: 6 }, { wch: 16 }, { wch: 28 }, { wch: 16 }, { wch: 14 }, { wch: 10 }, { wch: 18 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Rekap Nilai');
    XLSX.writeFile(
      wb,
      `rekap_nilai_${school?.npsn || 'sekolah'}_${new Date().toISOString().slice(0, 10)}.xlsx`
    );
    showToast(`Rekap nilai siswa ${school?.name || 'sekolah'} berhasil diunduh (.xlsx).`);
  };

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
              <BarChart2 className="w-5 h-5 text-blue-400" />
              <span>Rekap dan Laporan • {school?.name || 'Satuan Pendidikan'}</span>
            </h1>
            <p className="text-xs text-blue-200 mt-1 max-w-2xl leading-relaxed">
              Laporan presensi kehadiran, nilai asesmen, dan Berita Acara (BAP) khusus untuk peserta didik di{' '}
              <strong>{school?.name || 'sekolah Anda'}</strong>.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="px-3 py-1.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-semibold flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Hasil Terisolasi</span>
            </span>
          </div>
        </div>
      </div>

      {/* Subtab Navigation */}
      <div className="bg-white rounded-xl border border-slate-200 p-1 flex flex-wrap gap-1 shadow-xs">
        <button
          onClick={() => setActiveSubTab('kehadiran')}
          className={`flex-1 min-w-[140px] px-3 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 ${
            activeSubTab === 'kehadiran'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Rekap Kehadiran</span>
        </button>

        <button
          onClick={() => setActiveSubTab('laporan')}
          className={`flex-1 min-w-[140px] px-3 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 ${
            activeSubTab === 'laporan'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <BarChart2 className="w-3.5 h-3.5" />
          <span>Laporan Hasil Ujian</span>
        </button>

        <button
          onClick={() => setActiveSubTab('bap')}
          className={`flex-1 min-w-[140px] px-3 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 ${
            activeSubTab === 'bap'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Berita Acara (BAP)</span>
        </button>
      </div>

      {/* 1. SUBTAB: REKAP KEHADIRAN */}
      {activeSubTab === 'kehadiran' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <div className="text-[11px] font-bold text-slate-500 uppercase">Total Peserta Terdaftar</div>
              <div className="text-xl font-bold text-slate-900 mt-0.5">{students.length} Siswa</div>
              <div className="text-[10px] text-slate-500 mt-0.5">{school?.name || 'Sekolah'}</div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <div className="text-[11px] font-bold text-emerald-600 uppercase">Hadir Mengikuti Tes</div>
              <div className="text-xl font-bold text-emerald-700 mt-0.5">{totalHadir} Siswa</div>
              <div className="text-[10px] text-emerald-600 mt-0.5">Tingkat Kehadiran {attendancePct}%</div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <div className="text-[11px] font-bold text-amber-600 uppercase">Belum Hadir</div>
              <div className="text-xl font-bold text-amber-700 mt-0.5">{totalBelumHadir} Siswa</div>
              <div className="text-[10px] text-amber-600 mt-0.5">Belum memulai sesi</div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <div className="text-[11px] font-bold text-blue-600 uppercase">Sesi Selesai</div>
              <div className="text-xl font-bold text-blue-700 mt-0.5">{totalSelesai} Siswa</div>
              <div className="text-[10px] text-blue-600 mt-0.5">Sudah mengirim jawaban</div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-800">Presensi Sesi Ujian Siswa ({school?.name || 'Sekolah'})</h3>
              <button
                onClick={() => window.print()}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak Presensi</span>
              </button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 uppercase font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">No</th>
                    <th className="py-2.5 px-3">NISN</th>
                    <th className="py-2.5 px-3">Nama Siswa</th>
                    <th className="py-2.5 px-3">Rombel</th>
                    <th className="py-2.5 px-3">Status Sesi</th>
                    <th className="py-2.5 px-3">Kehadiran</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {studentRows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        Belum ada peserta didik terdaftar pada sekolah ini.
                      </td>
                    </tr>
                  ) : (
                    studentRows.map((st, i) => (
                      <tr key={st.id} className="hover:bg-slate-50/80">
                        <td className="py-2.5 px-3 text-slate-400 font-mono">{i + 1}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-600">{st.nisn}</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-900">{st.full_name}</td>
                        <td className="py-2.5 px-3 text-slate-600">{st.class_name || '-'}</td>
                        <td className="py-2.5 px-3 text-slate-600 uppercase text-[10px] font-semibold">
                          {st.sessionStatus}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              st.statusKehadiran === 'Hadir'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-slate-100 text-slate-600 border border-slate-200'
                            }`}
                          >
                            {st.statusKehadiran}
                          </span>
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

      {/* 2. SUBTAB: LAPORAN HASIL UJIAN */}
      {activeSubTab === 'laporan' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-blue-600" />
                Laporan Nilai Asesmen Siswa ({school?.name || 'Sekolah'})
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Rekap nilai resmi berdasarkan hasil pengerjaan ujian yang telah dinilai
              </p>
            </div>
            <button
              onClick={handleExportExcel}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Unduh Nilai Excel (.xlsx)</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-center">
              <div className="text-xs text-blue-600 font-bold uppercase">Rata-rata Nilai Sekolah</div>
              <div className="text-2xl font-black text-blue-900 mt-1">{avgScore}</div>
              <div className="text-[10px] text-blue-700 mt-0.5">Dari {gradedRows.length} peserta dinilai</div>
            </div>
            <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl text-center">
              <div className="text-xs text-indigo-600 font-bold uppercase">Peserta Menyelesaikan Ujian</div>
              <div className="text-2xl font-black text-indigo-900 mt-1">
                {totalSelesai} / {students.length}
              </div>
              <div className="text-[10px] text-indigo-700 mt-0.5">Status: Submitted / Graded</div>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase font-bold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">No</th>
                  <th className="py-2.5 px-3">NISN</th>
                  <th className="py-2.5 px-3">Nama Lengkap Siswa</th>
                  <th className="py-2.5 px-3">Rombel</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Nilai Akhir</th>
                  <th className="py-2.5 px-3">Predikat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {studentRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      Belum ada data hasil ujian siswa.
                    </td>
                  </tr>
                ) : (
                  studentRows.map((st, i) => (
                    <tr key={st.id} className="hover:bg-slate-50/80">
                      <td className="py-2.5 px-3 text-slate-400 font-mono">{i + 1}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-600">{st.nisn}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900">{st.full_name}</td>
                      <td className="py-2.5 px-3 text-slate-600">{st.class_name || '-'}</td>
                      <td className="py-2.5 px-3 text-slate-600 uppercase text-[10px]">{st.sessionStatus}</td>
                      <td className="py-2.5 px-3 font-mono font-black text-slate-900">
                        {st.score !== null ? st.score : '-'}
                      </td>
                      <td className="py-2.5 px-3">
                        {st.score !== null ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            {st.score >= 85 ? 'Mahir' : st.score >= 70 ? 'Cakap' : 'Perlu Bimbingan'}
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. SUBTAB: BERITA ACARA PELAKSANAAN (BAP) */}
      {activeSubTab === 'bap' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                Berita Acara Pelaksanaan (BAP) Ujian ({school?.name || 'Sekolah'})
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Dokumen pertanggungjawaban resmi pelaksanaan tes di sekolah ini
              </p>
            </div>
            <button
              onClick={() => window.print()}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak Formulir BAP</span>
            </button>
          </div>

          <div className="border-2 border-slate-300 rounded-2xl p-6 bg-slate-50/40 space-y-4 text-xs">
            <div className="flex items-center justify-center gap-3 pb-3 border-b border-slate-200 text-center">
              {school?.logo_url ? (
                <img src={school.logo_url} alt={school.name} className="w-11 h-11 object-contain rounded-lg shrink-0" />
              ) : (
                <TutWuriLogo size={42} className="shrink-0" />
              )}
              <div>
                <div className="font-extrabold text-sm text-slate-900 uppercase">
                  BERITA ACARA PELAKSANAAN ASESMEN SINTESA
                </div>
                <div className="font-bold text-slate-700 text-xs">
                  {school?.name || '-'} • NPSN: {school?.npsn || '-'}
                </div>
                <div className="text-[10px] text-slate-500">Tahun Ajaran {school?.academic_year || '2025/2026'}</div>
              </div>
            </div>

            <div className="space-y-2 text-slate-700 leading-relaxed">
              <p>
                Pada hari ini, <strong>{todayFormatted}</strong>, telah dilaksanakan Asesmen SINTESA di Satuan Pendidikan:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 bg-white border border-slate-200 rounded-xl">
                <div>• Nama Satuan Pendidikan: <strong>{school?.name || '-'}</strong></div>
                <div>• NPSN: <strong>{school?.npsn || '-'}</strong></div>
                <div>• Jumlah Siswa Terdaftar: <strong>{students.length} Siswa</strong></div>
                <div>• Jumlah Siswa Hadir: <strong>{totalHadir} Siswa</strong></div>
                <div>• Jumlah Siswa Selesai: <strong>{totalSelesai} Siswa</strong></div>
                <div>• Jumlah Belum Hadir: <strong>{totalBelumHadir} Siswa</strong></div>
              </div>
              <p>
                Catatan Pelaksanaan: Demikian berita acara pelaksanaan ujian ini dibuat dengan sebenar-benarnya untuk dipergunakan sebagaimana mestinya.
              </p>
            </div>

            <div className="pt-4 grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-[11px] text-slate-500">Proktor / Pengawas Ruang</div>
                <div className="mt-12 font-bold text-slate-900">
                  ({proctors[0]?.full_name || '....................................'})
                </div>
                <div className="text-[10px] text-slate-500">NIP. {proctors[0]?.nip || '-'}</div>
              </div>
              <div>
                <div className="text-[11px] text-slate-500">Kepala Satuan Pendidikan</div>
                <div className="mt-12 font-bold text-slate-900">
                  ({school?.principal_name || '....................................'})
                </div>
                <div className="text-[10px] text-slate-500">NIP. {school?.principal_nip || '-'}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
