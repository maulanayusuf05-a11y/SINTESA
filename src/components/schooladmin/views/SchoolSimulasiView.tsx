import React, { useState } from 'react';
import { tenantStore } from '../../../lib/supabase';
import { tkaStore } from '../../../lib/tkaStore';
import {
  RefreshCw,
  MonitorCheck,
  Calendar,
  Play,
  ShieldCheck,
  CheckCircle,
} from 'lucide-react';

interface SchoolSimulasiViewProps {
  schoolId: string;
  subTab?: string;
}

export const SchoolSimulasiView: React.FC<SchoolSimulasiViewProps> = ({
  schoolId,
  subTab = 'proktor',
}) => {
  const [activeSubTab, setActiveSubTab] = useState<string>(subTab);
  const school = tenantStore.getSchoolById(schoolId);
  const proctors = tenantStore.getProctors(schoolId);
  const proctorComputers = tkaStore.getProctorComputers(schoolId);
  const exams = tenantStore.getExams(schoolId);
  const tokens = tenantStore.getTokens(schoolId);
  const announcements = tkaStore.getAnnouncements();
  const [simNotice, setSimNotice] = useState<string | null>(null);

  return (
    <div className="space-y-5">
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
              <RefreshCw className="w-5 h-5 text-blue-400" />
              <span>Simulasi & Proktor • {school?.name || 'Satuan Pendidikan'}</span>
            </h1>
            <p className="text-xs text-blue-200 mt-1 max-w-2xl leading-relaxed">
              Daftar akun pengawas/proktor ruang, jadwal pelaksanaan resmi, dan status kesiapan simulasi untuk siswa{' '}
              <strong>{school?.name || 'sekolah Anda'}</strong>.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="px-3 py-1.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-semibold flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>{proctors.length > 0 ? `${proctors.length} Proktor Aktif` : 'Belum Ada Proktor'}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Subtab Navigation */}
      <div className="bg-white rounded-xl border border-slate-200 p-1 flex flex-wrap gap-1 shadow-xs">
        <button
          onClick={() => setActiveSubTab('proktor')}
          className={`flex-1 min-w-[140px] px-3 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 ${
            activeSubTab === 'proktor'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <MonitorCheck className="w-3.5 h-3.5" />
          <span>Komputer & Proktor</span>
        </button>

        <button
          onClick={() => setActiveSubTab('gladi')}
          className={`flex-1 min-w-[140px] px-3 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 ${
            activeSubTab === 'gladi'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Jadwal Gladi & Asesmen</span>
        </button>

        <button
          onClick={() => setActiveSubTab('siswa')}
          className={`flex-1 min-w-[140px] px-3 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 ${
            activeSubTab === 'siswa'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Play className="w-3.5 h-3.5" />
          <span>Simulasi Siswa</span>
        </button>
      </div>

      {/* 1. SUBTAB: KOMPUTER PROKTOR */}
      {activeSubTab === 'proktor' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
          <div className="pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <MonitorCheck className="w-4 h-4 text-blue-600" />
              Daftar Proktor & Komputer Lab ({school?.name || 'Sekolah'})
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Akun proktor sekolah dan perangkat ruang ujian yang terdaftar
            </p>
          </div>

          {proctors.length === 0 && proctorComputers.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
              Belum ada akun proktor atau komputer lab yang ditambahkan. Tambahkan proktor melalui menu{' '}
              <strong>Rombel & Guru Proktor</strong>.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {proctors.map((pr) => (
                <div key={pr.id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-sm">{pr.full_name}</span>
                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 font-bold rounded text-[10px] border border-emerald-200">
                      {pr.is_active ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </div>
                  <div className="space-y-1 font-mono text-slate-700">
                    <div>NIP: <strong>{pr.nip || '-'}</strong></div>
                    <div>Telepon: <strong>{pr.phone || '-'}</strong></div>
                  </div>
                </div>
              ))}
              {proctorComputers.map((pc) => (
                <div key={pc.id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-sm">{pc.room_name}</span>
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-700 font-bold rounded text-[10px] border border-blue-200">
                      {pc.status}
                    </span>
                  </div>
                  <div className="space-y-1 font-mono text-slate-700">
                    <div>ID Proktor: <strong className="text-blue-700">{pc.proctor_id_code}</strong></div>
                    <div>IP Address: <strong>{pc.ip_address || '-'}</strong></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 2. SUBTAB: JADWAL GLADI BERSIH */}
      {activeSubTab === 'gladi' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
          <div className="pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              Jadwal Pelaksanaan & Gladi ({school?.name || 'Sekolah'})
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Daftar paket asesmen sekolah dan pengumuman jadwal dari Super Admin Pusat
            </p>
          </div>

          {exams.length === 0 && announcements.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
              Belum ada jadwal gladi bersih atau paket ujian yang diterbitkan.
            </div>
          ) : (
            <div className="space-y-3 text-xs">
              {exams.map((ex) => (
                <div key={ex.id} className="p-4 bg-blue-50/60 border border-blue-200 rounded-xl space-y-1">
                  <div className="font-bold text-blue-900 text-sm">{ex.title}</div>
                  <div className="text-slate-600">
                    Kelas {ex.grade_level} • Durasi {ex.duration_minutes} Menit • KKM {ex.passing_grade}
                  </div>
                  <div className="text-emerald-700 font-semibold pt-1 uppercase text-[10px]">
                    Status: {ex.status}
                  </div>
                </div>
              ))}
              {announcements.map((ann) => (
                <div key={ann.id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <div className="font-bold text-slate-900 text-sm">{ann.title}</div>
                  <div className="text-slate-500 text-[11px]">{ann.date} • {ann.time} WIB</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 3. SUBTAB: SIMULASI SISWA */}
      {activeSubTab === 'siswa' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
          <div className="pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Play className="w-4 h-4 text-blue-600" />
              Kesiapan Uji Coba Lembar Soal Siswa ({school?.name || 'Sekolah'})
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Siswa mengikuti simulasi dan ujian melalui login akun Peserta Didik dengan memasukkan token sesi aktif
            </p>
          </div>

          {simNotice && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-blue-600 shrink-0" />
              <span>{simNotice}</span>
            </div>
          )}

          <div className="p-5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="font-bold text-blue-950 text-sm">Cek Kesiapan Simulasi Siswa</div>
              <p className="text-xs text-slate-600 mt-1 max-w-xl">
                Paket ujian tersedia: <strong>{exams.length}</strong> • Token aktif:{' '}
                <strong className="font-mono">{tokens.filter((t) => t.is_active).length}</strong>. Pastikan bank soal dan token sudah
                rilis sebelum siswa login.
              </p>
            </div>
            <button
              onClick={() =>
                setSimNotice(
                  exams.length > 0 && tokens.some((t) => t.is_active)
                    ? `Simulasi siap dijalankan! Siswa ${school?.name || ''} dapat login menggunakan NISN & Token aktif (${tokens.find((t) => t.is_active)?.token_code}).`
                    : 'Belum ada paket ujian atau token aktif. Silakan buat paket ujian di Bank Soal & Jadwal Sesi terlebih dahulu.'
                )
              }
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition shrink-0"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Periksa Kesiapan Simulasi</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
