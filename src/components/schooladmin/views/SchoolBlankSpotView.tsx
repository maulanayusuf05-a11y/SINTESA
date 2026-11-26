import React, { useState } from 'react';
import { tenantStore } from '../../../lib/supabase';
import { tkaStore } from '../../../lib/tkaStore';
import { BlankSpotRequest } from '../../../types/tka';
import {
  WifiOff,
  Wifi,
  Download,
  CheckCircle,
  Server,
  Usb,
  Send,
  ShieldCheck,
  Clock,
} from 'lucide-react';

interface SchoolBlankSpotViewProps {
  schoolId: string;
  subTab?: string;
}

export const SchoolBlankSpotView: React.FC<SchoolBlankSpotViewProps> = ({
  schoolId,
  subTab = 'status',
}) => {
  const [activeSubTab, setActiveSubTab] = useState<string>(subTab);
  const school = tenantStore.getSchoolById(schoolId);
  const [requests, setRequests] = useState<BlankSpotRequest[]>(() => tkaStore.getBlankSpotRequests(schoolId));

  // Submission State (empty defaults for production)
  const [reason, setReason] = useState('');
  const [bandwidth, setBandwidth] = useState('');
  const [submittedRequestId, setSubmittedRequestId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const approvedRequest = requests.find((r) => r.status === 'approved');
  const pendingRequest = requests.find((r) => r.status === 'pending');

  const handleSubmitSemiDaring = (e: React.FormEvent) => {
    e.preventDefault();
    if (!school || !reason.trim()) return;
    const created = tkaStore.addBlankSpotRequest({
      school_id: school.id,
      school_name: school.name,
      npsn: school.npsn,
      province: school.province,
      city_regency: school.city_regency,
      reason: reason.trim(),
      internet_speed_mbps: parseFloat(bandwidth) || 0,
    });
    setRequests(tkaStore.getBlankSpotRequests(schoolId));
    setSubmittedRequestId(created.id);
    setReason('');
    setBandwidth('');
    showToast('Permohonan moda semi-daring berhasil dikirim ke Super Admin Pusat.');
  };

  const handleDownloadSyncPackage = () => {
    const payload = {
      exported_at: new Date().toISOString(),
      school: school
        ? { id: school.id, name: school.name, npsn: school.npsn }
        : { id: schoolId },
      classes: tenantStore.getClasses(schoolId),
      students: tenantStore.getStudents(schoolId),
      exams: tenantStore.getExams(schoolId),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sync_sekolah_${school?.npsn || 'data'}_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`Berkas sinkronisasi data ${school?.name || 'sekolah'} berhasil diunduh (.json).`);
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
              <WifiOff className="w-5 h-5 text-blue-400" />
              <span>Sekolah Blank Spot • {school?.name || 'Satuan Pendidikan'}</span>
            </h1>
            <p className="text-xs text-blue-200 mt-1 max-w-2xl leading-relaxed">
              Pengelolaan moda ujian semi-daring, pengajuan dispensasi jaringan wilayah 3T/blank spot, dan unduhan paket data sinkronisasi untuk{' '}
              <strong>{school?.name || 'sekolah Anda'}</strong>.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="px-3 py-1.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-semibold flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>{approvedRequest ? 'Moda Semi-Daring Aktif' : 'Moda Daring'}</span>
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
          <Wifi className="w-3.5 h-3.5" />
          <span>Status Jaringan & Moda</span>
        </button>

        <button
          onClick={() => setActiveSubTab('pengajuan')}
          className={`flex-1 min-w-[140px] px-3 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 ${
            activeSubTab === 'pengajuan'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Send className="w-3.5 h-3.5" />
          <span>Pengajuan Semi Daring</span>
        </button>

        <button
          onClick={() => setActiveSubTab('sync')}
          className={`flex-1 min-w-[140px] px-3 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 ${
            activeSubTab === 'sync'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Usb className="w-3.5 h-3.5" />
          <span>Ekspor Paket Sync Lokal</span>
        </button>
      </div>

      {/* 1. SUBTAB: STATUS JARINGAN */}
      {activeSubTab === 'status' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
          <div className="pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Wifi className="w-4 h-4 text-emerald-600" />
              Status Moda Pelaksanaan di {school?.name || 'Sekolah'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Status verifikasi moda pelaksanaan dan konektivitas internet berdasarkan pengajuan sekolah
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
              <div className="font-bold text-emerald-800 text-sm flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span>Moda Pelaksanaan</span>
              </div>
              <div className="text-lg font-black text-slate-900">
                {approvedRequest ? 'Semi-Daring Disetujui' : pendingRequest ? 'Menunggu Verifikasi' : 'Daring (Online)'}
              </div>
              <p className="text-slate-600">
                {approvedRequest
                  ? 'Sekolah diizinkan menggunakan moda semi-daring sesuai persetujuan pusat.'
                  : 'Terhubung langsung ke server SINTESA secara daring.'}
              </p>
            </div>

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl space-y-2">
              <div className="font-bold text-blue-800 text-sm flex items-center gap-2">
                <Wifi className="w-4 h-4 text-blue-600" />
                <span>Status Pengajuan 3T</span>
              </div>
              <div className="text-lg font-black text-slate-900">{requests.length} Pengajuan</div>
              <p className="text-slate-600">
                {requests[0]
                  ? `Kecepatan tercatat: ${requests[0].internet_speed_mbps} Mbps (${requests[0].status})`
                  : 'Belum ada pengajuan kendala bandwidth yang dikirim.'}
              </p>
            </div>

            <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl space-y-2">
              <div className="font-bold text-indigo-800 text-sm flex items-center gap-2">
                <Server className="w-4 h-4 text-indigo-600" />
                <span>Status Perangkat</span>
              </div>
              <div className="text-lg font-black text-slate-900">
                {navigator.onLine ? 'Terhubung Internet' : 'Mode Offline'}
              </div>
              <p className="text-slate-600">
                Status koneksi browser saat ini ke layanan database cloud.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 2. SUBTAB: PENGAJUAN SEMI DARING */}
      {activeSubTab === 'pengajuan' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-5">
          <div className="pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Send className="w-4 h-4 text-blue-600" />
              Formulir Permohonan Moda Semi-Daring ({school?.name || 'Sekolah'})
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Ajukan permohonan ke Super Admin Pusat jika infrastruktur internet di wilayah sekolah mengalami kendala
            </p>
          </div>

          {submittedRequestId && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 space-y-1">
              <div className="font-bold text-sm flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span>Pengajuan Semi-Daring Berhasil Terkirim</span>
              </div>
              <p>
                ID Pengajuan: <strong className="font-mono">{submittedRequestId}</strong>. Menunggu verifikasi Super Admin Pusat.
              </p>
            </div>
          )}

          <form onSubmit={handleSubmitSemiDaring} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Satuan Pendidikan Pemohon</label>
              <input
                type="text"
                disabled
                value={`${school?.name || '-'} (NPSN: ${school?.npsn || '-'})`}
                className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-700 font-bold cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Kecepatan Internet Rata-rata (Mbps)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                placeholder="Contoh: 2.5"
                value={bandwidth}
                onChange={(e) => setBandwidth(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900"
                required
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Alasan Pengajuan Moda Semi-Daring</label>
              <textarea
                rows={3}
                placeholder="Jelaskan kondisi jaringan internet atau kendala wilayah sekolah Anda..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900"
                required
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Kirim Permohonan ke Super Admin Pusat</span>
              </button>
            </div>
          </form>

          {requests.length > 0 && (
            <div className="pt-4 border-t border-slate-100 space-y-2">
              <div className="text-xs font-bold text-slate-800">Riwayat Pengajuan Sekolah</div>
              <div className="space-y-2">
                {requests.map((r) => (
                  <div key={r.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="font-semibold text-slate-800">{r.reason}</div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                        <Clock className="w-3 h-3" />
                        <span>{new Date(r.submitted_at).toLocaleDateString('id-ID')}</span>
                        <span>•</span>
                        <span>{r.internet_speed_mbps} Mbps</span>
                      </div>
                      {r.rejection_reason && (
                        <div className="text-[11px] text-red-600 mt-1">Catatan: {r.rejection_reason}</div>
                      )}
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase self-start sm:self-center ${
                        r.status === 'approved'
                          ? 'bg-emerald-100 text-emerald-800'
                          : r.status === 'rejected'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {r.status === 'approved' ? 'Disetujui' : r.status === 'rejected' ? 'Ditolak' : 'Menunggu'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. SUBTAB: SYNC USB / EKSPOR DATA */}
      {activeSubTab === 'sync' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
          <div className="pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Usb className="w-4 h-4 text-blue-600" />
              Paket Sinkronisasi Data Sekolah ({school?.name || 'Sekolah'})
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Unduh cadangan data rombel, peserta didik, dan jadwal ujian sekolah dalam format JSON terstruktur
            </p>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="font-bold text-slate-900">Berkas Sinkronisasi Data Peserta ({school?.name || 'Sekolah'})</div>
                <div className="text-slate-500 text-[11px]">
                  Format: .json • Berisi data kelas, peserta didik, dan paket ujian aktif sekolah ini
                </div>
              </div>
              <button
                onClick={handleDownloadSyncPackage}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold flex items-center gap-1.5 shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Unduh File Sync (.json)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
