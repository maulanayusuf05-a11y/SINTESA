import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { tenantStore, generateUuid } from '../../lib/supabase';
import { ExamSession } from '../../types/database';
import {
  Clock,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  BookOpen,
  ArrowRight,
  Sparkles,
  FileQuestion,
} from 'lucide-react';

interface StudentDashboardProps {
  activeTab: string;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = () => {
  const { user, currentSchool } = useAuth();
  const schoolId = currentSchool?.id || '';

  const exams = tenantStore.getExams(schoolId);
  const tokens = tenantStore.getTokens(schoolId);
  const students = tenantStore.getStudents(schoolId);
  const studentRecord = students.find(
    (s) => s.id === user?.id || (user?.email && s.nisn === user.email.split('@')[0])
  );
  const activeExam = exams.find((e) => e.status === 'ongoing' || e.status === 'scheduled') || exams[0] || null;

  // State Pengerjaan Ujian
  const [examState, setExamState] = useState<'overview' | 'token_entry' | 'in_exam' | 'submitted'>('overview');
  const [tokenInput, setTokenInput] = useState('');
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number>(3600);
  const [activeSession, setActiveSession] = useState<ExamSession | null>(null);

  // Timer Effect saat ujian berlangsung
  useEffect(() => {
    if (examState !== 'in_exam') return;

    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleFinishSession();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [examState]);

  // Validasi Token Ujian
  const handleValidateToken = (e: React.FormEvent) => {
    e.preventDefault();
    setTokenError(null);

    if (!activeExam) {
      setTokenError('Belum ada jadwal ujian aktif yang ditetapkan untuk sekolah Anda.');
      return;
    }

    const entered = tokenInput.trim().toUpperCase();
    const validToken = tokens.find((t) => t.token_code.toUpperCase() === entered && t.is_active);

    if (!validToken) {
      setTokenError('Token ujian tidak valid atau sudah kedaluwarsa. Silakan minta token aktif dari pengawas ruangan.');
      return;
    }

    const duration = (activeExam.duration_minutes || 60) * 60;
    const now = new Date().toISOString();
    const newSession: ExamSession = {
      id: generateUuid(),
      school_id: schoolId,
      exam_id: activeExam.id,
      student_id: studentRecord?.id || user?.id || generateUuid(),
      student_name: user?.full_name || studentRecord?.full_name || 'Peserta Didik',
      student_nisn: studentRecord?.nisn || (user?.email ? user.email.split('@')[0] : '-'),
      class_name: studentRecord?.class_name || '-',
      status: 'in_progress',
      started_at: now,
      remaining_seconds: duration,
      browser_info: navigator.userAgent.slice(0, 60),
      created_at: now,
    };

    tenantStore.updateSession(newSession);
    setActiveSession(newSession);
    setSecondsLeft(duration);
    setExamState('in_exam');

    tenantStore.addAuditLog({
      school_id: schoolId,
      user_id: user?.id || 'student',
      user_role: 'student',
      user_email: user?.email || '',
      action: 'START_EXAM',
      entity_type: 'EXAM_SESSION',
      entity_id: activeExam.id,
      details: { token_used: entered, exam_title: activeExam.title },
    });
  };

  const handleFinishSession = () => {
    if (activeSession) {
      tenantStore.updateSession({
        ...activeSession,
        status: 'submitted',
        finished_at: new Date().toISOString(),
        remaining_seconds: 0,
      });
    }

    setExamState('submitted');

    tenantStore.addAuditLog({
      school_id: schoolId,
      user_id: user?.id || 'student',
      user_role: 'student',
      user_email: user?.email || '',
      action: 'SUBMIT_EXAM',
      entity_type: 'EXAM_SESSION',
      entity_id: activeExam?.id,
      details: { exam_title: activeExam?.title },
    });
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const displayNisn = studentRecord?.nisn || (user?.email ? user.email.split('@')[0] : '-');

  return (
    <div className="space-y-6">
      {/* 1. STATE: OVERVIEW / BERANDA PESERTA DIDIK */}
      {examState === 'overview' && (
        <>
          {/* Student Profile Card */}
          <div className="bg-gradient-to-r from-emerald-700 via-teal-700 to-slate-900 rounded-2xl p-6 text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center font-bold text-2xl border border-white/30">
                {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'S'}
              </div>
              <div>
                <span className="px-2 py-0.5 bg-emerald-400/30 text-emerald-100 rounded text-[10px] font-bold uppercase tracking-wider">
                  Peserta Didik Terdaftar
                </span>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight mt-0.5">
                  {user?.full_name || 'Peserta Didik'}
                </h1>
                <p className="text-xs text-emerald-100 mt-1 flex flex-wrap items-center gap-2">
                  <span>{currentSchool?.name || 'Sekolah Belum Ditautkan'}</span>
                  <span>•</span>
                  <span>{studentRecord?.class_name || 'Rombel Belum Diatur'}</span>
                  <span>•</span>
                  <span className="font-mono bg-black/20 px-2 py-0.5 rounded">
                    NISN: {displayNisn}
                  </span>
                </p>
              </div>
            </div>

            <div className="bg-white/10 p-3.5 rounded-xl border border-white/20 text-xs">
              <div className="text-emerald-200 font-bold mb-1">Status Sesi Ujian:</div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
                <span className="font-semibold text-white">
                  {activeExam ? 'Jadwal Ujian Tersedia' : 'Menunggu Jadwal Ujian'}
                </span>
              </div>
            </div>
          </div>

          {/* Available Exams Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-emerald-600" />
                Daftar Asesmen / Ujian Hari Ini
              </h2>
              <p className="text-xs text-slate-500">
                Pilih mata pelajaran yang dijadwalkan oleh sekolah Anda dan masukkan token pengawas
              </p>
            </div>

            {activeExam ? (
              <div className="p-5 bg-gradient-to-br from-slate-50 to-blue-50/40 border border-slate-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-[10px] font-bold uppercase">
                    {activeExam.subject_name || 'Mata Pelajaran'}
                  </span>
                  <h3 className="text-base font-bold text-slate-900">{activeExam.title}</h3>
                  <div className="text-xs text-slate-500 flex flex-wrap items-center gap-3">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      Durasi: {activeExam.duration_minutes} Menit
                    </span>
                    <span>•</span>
                    <span>KKM: {activeExam.passing_grade}</span>
                  </div>
                </div>

                <div>
                  <button
                    onClick={() => setExamState('token_entry')}
                    className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2"
                  >
                    <span>Masuk Ruang Ujian</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl bg-slate-50">
                Belum ada jadwal ujian aktif untuk kelas Anda saat ini.
              </div>
            )}
          </div>

          {/* Child-Friendly Examination Guide */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-amber-900 text-xs space-y-2">
            <div className="font-bold flex items-center gap-2 text-amber-800 text-sm">
              <Sparkles className="w-4 h-4 text-amber-600" />
              Petunjuk Mengerjakan Ujian:
            </div>
            <ul className="list-disc list-inside space-y-1 text-amber-800/90 pl-1">
              <li>Berdoa sebelum memulai mengerjakan soal ujian.</li>
              <li>Minta <strong>Token Ujian</strong> yang sedang aktif kepada Guru Pengawas di ruangan Anda.</li>
              <li>Baca setiap pertanyaan dengan teliti sebelum memilih jawaban.</li>
              <li>Pastikan semua jawaban sudah diperiksa sebelum mengakhiri sesi ujian.</li>
            </ul>
          </div>
        </>
      )}

      {/* 2. STATE: TOKEN ENTRY */}
      {examState === 'token_entry' && (
        <div className="max-w-md mx-auto bg-white rounded-2xl border border-slate-200 shadow-xl p-6 sm:p-8 space-y-5">
          <div className="text-center space-y-1">
            <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-2">
              <KeyRound className="w-6 h-6" />
            </div>
            <h2 className="text-base font-bold text-slate-900">Masukkan Token Ujian</h2>
            <p className="text-xs text-slate-500">
              {activeExam?.title} {activeExam?.subject_name ? `(${activeExam.subject_name})` : ''}
            </p>
          </div>

          {tokenError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-800">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{tokenError}</span>
            </div>
          )}

          <form onSubmit={handleValidateToken} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 text-center">
                Kode Token Ujian
              </label>
              <input
                type="text"
                required
                maxLength={10}
                placeholder="Masukkan token aktif"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value.toUpperCase())}
                className="w-full text-center text-xl font-mono font-bold tracking-widest px-4 py-3 border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500 uppercase"
              />
              <span className="text-[11px] text-slate-400 block text-center mt-1">
                Token diberikan oleh Guru Pengawas di ruang ujian
              </span>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setExamState('overview')}
                className="flex-1 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Kembali
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md transition"
              >
                Verifikasi Token
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 3. STATE: IN EXAM */}
      {examState === 'in_exam' && (
        <div className="space-y-4">
          <div className="bg-slate-900 text-white rounded-2xl p-4 flex items-center justify-between shadow-md">
            <div>
              <div className="text-[10px] uppercase font-bold text-emerald-400">
                {activeExam?.subject_name || 'Sesi Ujian'} • {studentRecord?.class_name || 'Peserta'}
              </div>
              <h2 className="text-sm font-bold text-white truncate max-w-sm sm:max-w-md">
                {activeExam?.title}
              </h2>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700">
                <Clock className="w-4 h-4 text-amber-400 animate-pulse" />
                <span className="font-mono text-sm font-bold text-amber-300">
                  {formatTime(secondsLeft)}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-8 text-center space-y-4 max-w-xl mx-auto">
            <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto">
              <FileQuestion className="w-7 h-7" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-slate-900">Sesi Ujian Terverifikasi</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Token ujian valid dan kehadiran Anda sudah tercatat pada pemantauan proktor.
                Paket butir soal untuk ujian ini belum ditautkan oleh Admin Sekolah.
              </p>
            </div>
            <div className="pt-2 flex justify-center gap-2">
              <button
                onClick={handleFinishSession}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition"
              >
                Akhiri & Catat Sesi Selesai
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. STATE: SUBMITTED */}
      {examState === 'submitted' && (
        <div className="max-w-md mx-auto bg-white rounded-2xl border border-slate-200 shadow-xl p-8 text-center space-y-4">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Sesi Ujian Selesai!</h2>
            <p className="text-xs text-slate-500 mt-1">
              Status sesi Anda telah tercatat pada sistem sekolah. Terima kasih telah mengikuti asesmen dengan tertib.
            </p>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 text-left space-y-1 font-mono">
            <div>Peserta: {user?.full_name}</div>
            <div>Mata Pelajaran: {activeExam?.subject_name || '-'}</div>
            <div>Status: Terverifikasi Sistem</div>
          </div>

          <button
            onClick={() => setExamState('overview')}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition"
          >
            Kembali ke Beranda Peserta
          </button>
        </div>
      )}
    </div>
  );
};
