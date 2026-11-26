import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { tenantStore } from '../../../lib/supabase';
import { School, Student } from '../../../types/database';
import {
  FileText,
  BarChart3,
  CheckCircle,
  Printer,
  Download,
  Radio,
} from 'lucide-react';

interface TkaRekapLaporanViewProps {
  subTab?: string;
}

export const TkaRekapLaporanView: React.FC<TkaRekapLaporanViewProps> = ({
  subTab = 'kehadiran',
}) => {
  const [activeSubTab, setActiveSubTab] = useState<string>(subTab);
  const [schools] = useState<School[]>(tenantStore.getSchools());
  const [students] = useState<Student[]>(tenantStore.getStudents());
  const [sessions, setSessions] = useState(tenantStore.getSessions());
  const [bapSchoolId, setBapSchoolId] = useState<string>(schools[0]?.id || '');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Real attendance calculations
  const attendedSessions = sessions.filter(
    (s) => s.status === 'in_progress' || s.status === 'submitted'
  );
  const totalRegistered = students.length;
  const totalAttended = attendedSessions.length;
  const totalAbsent = Math.max(0, totalRegistered - totalAttended);
  const overallPct = totalRegistered > 0 ? Math.round((totalAttended / totalRegistered) * 100) : 0;

  // Real score calculations
  const gradedSessions = sessions.filter((s) => typeof s.score === 'number');
  const mahirCount = gradedSessions.filter((s) => (s.score || 0) >= 85).length;
  const cakapCount = gradedSessions.filter((s) => (s.score || 0) >= 70 && (s.score || 0) < 85).length;
  const bimbinganCount = gradedSessions.filter((s) => (s.score || 0) < 70).length;
  const mahirPct = gradedSessions.length > 0 ? Math.round((mahirCount / gradedSessions.length) * 100) : 0;
  const cakapPct = gradedSessions.length > 0 ? Math.round((cakapCount / gradedSessions.length) * 100) : 0;
  const bimbinganPct = gradedSessions.length > 0 ? Math.round((bimbinganCount / gradedSessions.length) * 100) : 0;
  const passedCount = gradedSessions.filter((s) => (s.score || 0) >= 70).length;
  const passRatePct = gradedSessions.length > 0 ? ((passedCount / gradedSessions.length) * 100).toFixed(1) : '0';

  const handleExportExcel = () => {
    const rows = sessions.map((sess, idx) => {
      const sch = schools.find((s) => s.id === sess.school_id);
      return [
        idx + 1,
        sess.student_nisn || '-',
        sess.student_name || '-',
        sch?.name || '-',
        sess.class_name || '-',
        sess.status,
        typeof sess.score === 'number' ? sess.score : '-',
      ];
    });
    const sheetData = [
      ['No', 'NISN', 'Nama Peserta', 'Satuan Pendidikan', 'Rombel', 'Status Sesi', 'Nilai'],
      ...(rows.length > 0 ? rows : [['-', '-', 'Belum ada data sesi ujian', '-', '-', '-', '-']]),
    ];
    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    ws['!cols'] = [{ wch: 6 }, { wch: 16 }, { wch: 28 }, { wch: 30 }, { wch: 14 }, { wch: 16 }, { wch: 10 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Laporan Nilai');
    XLSX.writeFile(wb, `laporan_nilai_nasional_${new Date().toISOString().slice(0, 10)}.xlsx`);
    showToast('Laporan nilai berhasil diunduh dalam format Excel (.xlsx).');
  };

  const bapSchool = schools.find((s) => s.id === bapSchoolId) || schools[0] || null;
  const bapStudentsCount = bapSchool ? tenantStore.getStudents(bapSchool.id).length : 0;
  const bapAttendedCount = bapSchool
    ? sessions.filter(
        (s) => s.school_id === bapSchool.id && (s.status === 'in_progress' || s.status === 'submitted')
      ).length
    : 0;
  const todayFormatted = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="space-y-4">
      {/* Subtab Bar */}
      <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-2">
        <button
          onClick={() => setActiveSubTab('kehadiran')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition ${
            activeSubTab === 'kehadiran'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <CheckCircle className="w-4 h-4" />
          <span>Rekap Kehadiran Peserta</span>
        </button>

        <button
          onClick={() => setActiveSubTab('laporan')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition ${
            activeSubTab === 'laporan'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Laporan Nilai & Statistik</span>
        </button>

        <button
          onClick={() => setActiveSubTab('bap')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition ${
            activeSubTab === 'bap'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Berita Acara Pelaksanaan (BAP)</span>
        </button>

        <button
          onClick={() => setActiveSubTab('monitor')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition ${
            activeSubTab === 'monitor'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Radio className="w-4 h-4 text-rose-500" />
          <span>Monitoring Ujian Real-Time</span>
        </button>
      </div>

      {/* REKAP KEHADIRAN */}
      {activeSubTab === 'kehadiran' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                Rekapitulasi Kehadiran Peserta Ujian SINTESA
              </h2>
              <p className="text-xs text-slate-500">
                Tingkat partisipasi kehadiran siswa berdasarkan sesi pengerjaan aktif dan selesai
              </p>
            </div>
            <button
              onClick={() => window.print()}
              className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak Rekap Presensi</span>
            </button>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[10px] text-slate-400 uppercase block font-semibold">Total Terdaftar</span>
              <span className="text-xl font-bold text-slate-900 mt-0.5">{totalRegistered} Siswa</span>
            </div>
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl">
              <span className="text-[10px] text-emerald-600 uppercase block font-semibold">Hadir Mengerjakan</span>
              <span className="text-xl font-bold text-emerald-800 mt-0.5">
                {totalAttended} Siswa ({overallPct}%)
              </span>
            </div>
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl">
              <span className="text-[10px] text-amber-600 uppercase block font-semibold">Sesi Selesai</span>
              <span className="text-xl font-bold text-amber-800 mt-0.5">
                {sessions.filter((s) => s.status === 'submitted').length} Siswa
              </span>
            </div>
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl">
              <span className="text-[10px] text-red-600 uppercase block font-semibold">Belum Hadir</span>
              <span className="text-xl font-bold text-red-800 mt-0.5">{totalAbsent} Siswa</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase font-bold border-y border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Satuan Pendidikan</th>
                  <th className="py-2.5 px-3">NPSN</th>
                  <th className="py-2.5 px-3">Terdaftar</th>
                  <th className="py-2.5 px-3">Hadir</th>
                  <th className="py-2.5 px-3">Persentase</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {schools.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      Belum ada satuan pendidikan terdaftar.
                    </td>
                  </tr>
                ) : (
                  schools.map((sch) => {
                    const sCount = tenantStore.getStudents(sch.id).length;
                    const hCount = sessions.filter(
                      (s) => s.school_id === sch.id && (s.status === 'in_progress' || s.status === 'submitted')
                    ).length;
                    const pct = sCount > 0 ? Math.round((hCount / sCount) * 100) : 0;
                    return (
                      <tr key={sch.id} className="hover:bg-slate-50/80">
                        <td className="py-3 px-3 font-bold text-slate-800">{sch.name}</td>
                        <td className="py-3 px-3 font-mono text-slate-500">{sch.npsn}</td>
                        <td className="py-3 px-3 font-semibold text-slate-700">{sCount}</td>
                        <td className="py-3 px-3 font-semibold text-emerald-700">{hCount}</td>
                        <td className="py-3 px-3 font-bold text-slate-900">{pct}%</td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              sCount > 0 && hCount >= sCount
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {sCount === 0 ? 'Belum Ada Siswa' : hCount >= sCount ? 'Lengkap' : 'Berjalan'}
                          </span>
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

      {/* LAPORAN NILAI */}
      {activeSubTab === 'laporan' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="pb-3 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-blue-600" />
              Laporan Capaian Kompetensi & Nilai Ujian
            </h2>
            <p className="text-xs text-slate-500">
              Analisis capaian nilai peserta ujian berdasarkan data sesi yang telah dinilai
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <div className="font-bold text-slate-800 text-sm">
                Distribusi Nilai ({gradedSessions.length} Peserta Dinilai)
              </div>
              {gradedSessions.length === 0 ? (
                <div className="py-6 text-center text-slate-400">
                  Belum ada nilai ujian yang tercatat pada sistem.
                </div>
              ) : (
                <div className="space-y-2 pt-1">
                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span>Sangat Mahir (85 - 100)</span>
                      <span className="font-bold">{mahirPct}% ({mahirCount})</span>
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div className="bg-emerald-500 h-full" style={{ width: `${mahirPct}%` }}></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span>Cakap & Terampil (70 - 84)</span>
                      <span className="font-bold">{cakapPct}% ({cakapCount})</span>
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div className="bg-blue-500 h-full" style={{ width: `${cakapPct}%` }}></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span>Perlu Bimbingan (&lt; 70)</span>
                      <span className="font-bold">{bimbinganPct}% ({bimbinganCount})</span>
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div className="bg-amber-500 h-full" style={{ width: `${bimbinganPct}%` }}></div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-xl space-y-2">
              <div className="font-bold text-blue-900 text-sm">Ketercapaian Standar Ketuntasan Minimal (KKM)</div>
              <p className="text-blue-800 text-[11px] leading-relaxed">
                {gradedSessions.length > 0 ? (
                  <>
                    Tingkat ketuntasan peserta mencapai <strong>{passRatePct}%</strong> ({passedCount} dari {gradedSessions.length} sesi dinilai).
                  </>
                ) : (
                  'Data ketuntasan akan dihitung otomatis setelah peserta menyelesaikan ujian dan nilai tersimpan.'
                )}
              </p>
              <button
                onClick={handleExportExcel}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Unduh Laporan Nilai Excel (.xlsx)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BERITA ACARA UJIAN (BAP) */}
      {activeSubTab === 'bap' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                Berita Acara Pelaksanaan Ujian (BAP)
              </h2>
              <p className="text-xs text-slate-500">
                Dokumen pertanggungjawaban pelaksanaan ujian satuan pendidikan
              </p>
            </div>
            <div className="flex items-center gap-2">
              {schools.length > 0 && (
                <select
                  value={bapSchool?.id || ''}
                  onChange={(e) => setBapSchoolId(e.target.value)}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
                >
                  {schools.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              )}
              <button
                onClick={() => window.print()}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak Berita Acara</span>
              </button>
            </div>
          </div>

          <div className="border border-slate-300 rounded-xl p-5 space-y-4 text-xs text-slate-800 max-w-2xl mx-auto bg-slate-50/40">
            <div className="text-center pb-3 border-b-2 border-slate-800 space-y-1">
              <div className="font-bold text-[11px] uppercase tracking-wider text-slate-500">
                KEMENTERIAN PENDIDIKAN DASAR DAN MENENGAH
              </div>
              <div className="font-black text-sm uppercase text-slate-900">
                BERITA ACARA PELAKSANAAN ASESMEN BERBASIS KOMPUTER
              </div>
            </div>

            <p className="leading-relaxed text-justify">
              Pada hari ini, <strong>{todayFormatted}</strong>, telah dilaksanakan Ujian Digital bertempat di ruang ujian satuan pendidikan penyelenggara, dengan rincian sebagai berikut:
            </p>

            <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-1.5">
              <div>
                Nama Sekolah: <strong>{bapSchool?.name || 'Belum ada sekolah dipilih'}</strong> (NPSN:{' '}
                <span className="font-mono">{bapSchool?.npsn || '-'}</span>)
              </div>
              <div>Jumlah Peserta Terdaftar: <strong>{bapStudentsCount} Orang</strong></div>
              <div>Jumlah Peserta Hadir: <strong>{bapAttendedCount} Orang</strong></div>
              <div>Catatan Pelaksanaan: <em>Dilaporkan sesuai kondisi aktual di ruang ujian.</em></div>
            </div>

            <div className="grid grid-cols-2 pt-4 text-center">
              <div className="space-y-12">
                <div>Pengawas Ruang Ujian</div>
                <div className="font-bold underline">( ........................................ )</div>
              </div>
              <div className="space-y-12">
                <div>Penanggung Jawab / Kepala Sekolah</div>
                <div className="font-bold underline">
                  {bapSchool?.principal_name && bapSchool.principal_name !== '-'
                    ? bapSchool.principal_name
                    : '( ........................................ )'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MONITORING UJIAN REAL-TIME */}
      {activeSubTab === 'monitor' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Radio className="w-4 h-4 text-rose-500 animate-pulse" />
                Live Monitoring Peserta Ujian SINTESA (Nasional)
              </h2>
              <p className="text-xs text-slate-500">
                Pemantauan sesi pengerjaan ujian siswa secara real-time, sisa waktu, IP klien, dan status koneksi
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
                <span>{sessions.filter((s) => s.status === 'in_progress').length} Aktif Mengerjakan</span>
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase font-bold border-y border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Nama Siswa & NISN</th>
                  <th className="py-2.5 px-3">Satuan Pendidikan</th>
                  <th className="py-2.5 px-3">Rombel</th>
                  <th className="py-2.5 px-3">IP Klien</th>
                  <th className="py-2.5 px-3">Sisa Waktu</th>
                  <th className="py-2.5 px-3">Status Pengerjaan</th>
                  <th className="py-2.5 px-3 text-right">Aksi Proktor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sessions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-slate-400">
                      Belum ada sesi pengerjaan ujian yang berlangsung.
                    </td>
                  </tr>
                ) : (
                  sessions.map((sess) => {
                    const schoolName = schools.find((s) => s.id === sess.school_id)?.name || '-';
                    return (
                      <tr key={sess.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-900">{sess.student_name}</div>
                          <div className="text-[11px] font-mono text-slate-500">NISN: {sess.student_nisn}</div>
                        </td>
                        <td className="py-3 px-3 font-medium text-slate-700">{schoolName}</td>
                        <td className="py-3 px-3 text-slate-600">{sess.class_name || '-'}</td>
                        <td className="py-3 px-3 font-mono text-slate-500">{sess.ip_address || '-'}</td>
                        <td className="py-3 px-3 font-mono font-bold text-blue-700">
                          {Math.floor(sess.remaining_seconds / 60)} menit
                        </td>
                        <td className="py-3 px-3">
                          {sess.status === 'in_progress' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-ping"></span>
                              Sedang Mengerjakan
                            </span>
                          ) : sess.status === 'submitted' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              <CheckCircle className="w-3 h-3 text-emerald-600" />
                              Selesai Dikirim
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                              Belum Mulai
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => {
                              tenantStore.updateSession({
                                ...sess,
                                status: 'not_started',
                                ip_address: undefined,
                                browser_info: undefined,
                              });
                              setSessions(tenantStore.getSessions());
                              showToast(`Sesi siswa ${sess.student_name} telah di-reset. Siswa dapat login kembali.`);
                            }}
                            className="px-2.5 py-1 text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded text-[11px] font-semibold transition"
                          >
                            Reset Login
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

      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl text-xs font-medium border border-slate-700">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
