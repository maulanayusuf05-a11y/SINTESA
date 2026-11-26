import React, { useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { tenantStore, isSupabaseConfigured, supabase } from '../../../lib/supabase';
import {
  User,
  KeyRound,
  CheckCircle,
  Save,
  Lock,
  AlertCircle,
} from 'lucide-react';

export const TkaPengaturanAkunView: React.FC = () => {
  const { user, updateCurrentUser } = useAuth();
  const [fullName, setFullName] = useState(user?.full_name || 'Administrator Pusat');
  const [email] = useState(user?.email || 'admin@kemdikbud.edujian.id');
  const [phone, setPhone] = useState(user?.phone || '');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);

    if (!user) return;
    if (!fullName.trim()) {
      setProfileError('Nama lengkap wajib diisi.');
      return;
    }

    const existingStored = tenantStore.getProfiles().find((p) => p.id === user.id);
    const now = new Date().toISOString();
    const updatedProfile = {
      ...user,
      full_name: fullName.trim(),
      phone: phone.trim(),
      password: existingStored?.password,
      updated_at: now,
    };

    tenantStore.saveProfile(updatedProfile);
    updateCurrentUser({
      ...user,
      full_name: fullName.trim(),
      phone: phone.trim(),
      updated_at: now,
    });

    tenantStore.addAuditLog({
      school_id: null,
      user_id: user.id,
      user_role: user.role,
      user_email: user.email,
      action: 'UPDATE_SUPERADMIN_PROFILE',
      entity_type: 'PROFILE',
      entity_id: user.id,
      details: { full_name: fullName.trim() },
    });

    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);

    if (!user) return;

    if (newPassword.length < 6) {
      setPasswordError('Kata sandi baru minimal harus 6 karakter.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Konfirmasi kata sandi baru tidak cocok!');
      return;
    }

    const profiles = tenantStore.getProfiles();
    const storedProfile = profiles.find((p) => p.id === user.id);

    if (storedProfile?.password && oldPassword !== storedProfile.password) {
      setPasswordError('Kata sandi saat ini tidak sesuai.');
      return;
    }

    setIsUpdatingPassword(true);

    if (isSupabaseConfigured && supabase) {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData?.session) {
          const { error } = await supabase.auth.updateUser({ password: newPassword });
          if (error) {
            setIsUpdatingPassword(false);
            setPasswordError(`Gagal memperbarui kata sandi di Supabase Auth: ${error.message}`);
            return;
          }
        }
      } catch (err) {
        console.warn('Supabase Auth updateUser skipped:', err);
      }
    }

    const now = new Date().toISOString();
    const updatedProfile = {
      ...(storedProfile || user),
      full_name: fullName.trim() || user.full_name,
      phone: phone.trim(),
      password: newPassword,
      updated_at: now,
    };

    tenantStore.saveProfile(updatedProfile);
    tenantStore.addAuditLog({
      school_id: null,
      user_id: user.id,
      user_role: user.role,
      user_email: user.email,
      action: 'CHANGE_PASSWORD',
      entity_type: 'AUTH',
      entity_id: user.id,
    });

    setIsUpdatingPassword(false);
    setPasswordSuccess(true);
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setTimeout(() => setPasswordSuccess(false), 4000);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
        <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <User className="w-4 h-4 text-blue-600" />
          Pengaturan Akun & Keamanan Akses Super Admin
        </h2>
        <p className="text-xs text-slate-500">
          Kelola profil identitas administrator Pusat Asesmen Pendidikan dan konfigurasi kata sandi
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        {/* Form Profil */}
        <form
          onSubmit={handleUpdateProfile}
          className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-3"
        >
          <div className="font-bold text-slate-800 text-sm flex items-center gap-2 pb-2 border-b border-slate-100">
            <User className="w-4 h-4 text-blue-600" />
            <span>Profil Pengguna Super Admin</span>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Nama Lengkap & Gelar</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Email Resmi Kedinasan</label>
            <input
              type="email"
              disabled
              value={email}
              className="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-lg text-slate-500 font-mono"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Nomor Telepon / WhatsApp</label>
            <input
              type="text"
              placeholder="Contoh: 0812xxxxxxxx"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Peran Akses (Role)</label>
            <div className="px-3 py-2 bg-purple-50 text-purple-700 font-bold rounded-lg border border-purple-200">
              Super Admin Pengendali Utama (Kemendikdasmen)
            </div>
          </div>

          {profileError && (
            <div className="p-2.5 bg-red-50 border border-red-200 text-red-800 rounded-lg text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{profileError}</span>
            </div>
          )}

          <button
            type="submit"
            className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs transition"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Simpan Perubahan Profil</span>
          </button>

          {isSaved && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span>Profil berhasil disimpan ke database!</span>
            </div>
          )}
        </form>

        {/* Form Ganti Password */}
        <form
          onSubmit={handleChangePassword}
          className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-3"
        >
          <div className="font-bold text-slate-800 text-sm flex items-center gap-2 pb-2 border-b border-slate-100">
            <Lock className="w-4 h-4 text-purple-600" />
            <span>Perbarui Kata Sandi (Password)</span>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Kata Sandi Saat Ini</label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Kata Sandi Baru</label>
            <input
              type="password"
              required
              minLength={6}
              placeholder="Minimal 6 karakter"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Konfirmasi Kata Sandi Baru</label>
            <input
              type="password"
              required
              minLength={6}
              placeholder="Ketik ulang kata sandi baru"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {passwordError && (
            <div className="p-2.5 bg-red-50 border border-red-200 text-red-800 rounded-lg text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{passwordError}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isUpdatingPassword}
            className="w-full py-2 bg-purple-700 hover:bg-purple-800 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs transition"
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>{isUpdatingPassword ? 'Menyimpan...' : 'Perbarui Password'}</span>
          </button>

          {passwordSuccess && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span>Kata sandi berhasil diperbarui dan tersimpan aman.</span>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};
