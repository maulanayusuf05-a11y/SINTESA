import React, { useState } from 'react';
import { useAuth, RegisterSchoolData } from '../../contexts/AuthContext';
import { compressLogoImage } from '../../lib/imageUtils';
import { TutWuriLogo } from '../common/TutWuriLogo';
import {
  Building2,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  User,
  Mail,
  Phone,
  Lock,
  Sparkles,
  Upload,
  RotateCcw,
  Eye,
  EyeOff,
} from 'lucide-react';

interface RegisterSchoolPageProps {
  onBackToLogin: () => void;
}

export const RegisterSchoolPage: React.FC<RegisterSchoolPageProps> = ({ onBackToLogin }) => {
  const { registerSchool } = useAuth();

  const [formData, setFormData] = useState<RegisterSchoolData>({
    school_name: '',
    npsn: '',
    education_level: 'SD',
    school_type: 'negeri',
    address: '',
    principal_name: '',
    principal_nip: '',
    academic_year: '2025/2026',
    logo_url: '',
    admin_name: '',
    email: '',
    phone: '',
    password: '',
  });

  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setErrorMessage('File logo harus berupa gambar (PNG, JPG, SVG, atau WEBP).');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setErrorMessage('Ukuran logo maksimal 2 MB.');
      return;
    }
    try {
      const compressed = await compressLogoImage(file);
      setErrorMessage(null);
      setFormData((prev) => ({ ...prev, logo_url: compressed }));
    } catch (err: any) {
      setErrorMessage(err?.message || 'Gagal memproses gambar logo.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!formData.school_name.trim()) {
      setErrorMessage('Nama Sekolah wajib diisi.');
      return;
    }

    if (!/^\d{8}$/.test(formData.npsn.trim())) {
      setErrorMessage('NPSN harus berupa 8 digit angka sesuai pangkalan data Dapodik.');
      return;
    }

    if (!formData.address.trim()) {
      setErrorMessage('Alamat Sekolah wajib diisi.');
      return;
    }

    if (!formData.principal_name.trim()) {
      setErrorMessage('Nama Kepala Sekolah wajib diisi.');
      return;
    }

    if (!formData.academic_year.trim()) {
      setErrorMessage('Tahun Pelajaran wajib diisi.');
      return;
    }

    if (!formData.admin_name.trim()) {
      setErrorMessage('Nama Admin Sekolah pengelola wajib diisi.');
      return;
    }

    if (!formData.email.trim()) {
      setErrorMessage('Email / Username login wajib diisi.');
      return;
    }

    if (formData.password.length < 6) {
      setErrorMessage('Kata sandi minimal 6 karakter.');
      return;
    }

    if (formData.password !== confirmPassword) {
      setErrorMessage('Konfirmasi kata sandi tidak cocok.');
      return;
    }

    setIsSubmitting(true);
    const result = await registerSchool(formData);
    setIsSubmitting(false);

    if (!result.success) {
      setErrorMessage(result.error || 'Terjadi kesalahan saat mendaftarkan sekolah.');
    } else {
      setSuccessMessage('Pendaftaran sekolah berhasil! Data sekolah telah tersinkron dan Anda otomatis dialihkan ke Portal Admin Sekolah.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-blue-50/30 to-slate-100 py-8 px-4 sm:px-6 lg:px-8 flex flex-col justify-center items-center">
      <div className="max-w-3xl w-full">
        {/* Header Back Button */}
        <div className="flex items-center justify-between mb-6">
          <button
            type="button"
            onClick={onBackToLogin}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-blue-700 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-xs transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Halaman Masuk</span>
          </button>
        </div>

        {/* Card Container */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200/80 overflow-hidden">
          {/* Card Banner */}
          <div className="bg-gradient-to-r from-blue-700 to-indigo-700 p-6 text-white">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 bg-white/10 backdrop-blur-xs rounded-xl">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight">Pendaftaran Sekolah Baru (SD / MI)</h1>
                <p className="text-xs text-blue-100">
                  SINTESA - Sistem Informasi Tes dan Asesmen Multi-Tenant
                </p>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2 text-[11px] bg-white/10 px-3 py-1.5 rounded-lg border border-white/20">
              <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0" />
              <span>
                Aktivasi &amp; Sinkronisasi Instan: Data sekolah, struktur kelas (1 s/d 6), dan akun Admin Sekolah langsung tersinkron ke Portal Admin Sekolah &amp; Super Admin.
              </span>
            </div>
          </div>

          {/* Form Content */}
          <div className="p-6 sm:p-8">
            {errorMessage && (
              <div className="mb-6 p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-xs text-red-800">
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-semibold">Gagal Mendaftarkan Sekolah:</strong>
                  <span>{errorMessage}</span>
                </div>
              </div>
            )}

            {successMessage && (
              <div className="mb-6 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3 text-xs text-emerald-800">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-semibold">Selamat!</strong>
                  <span>{successMessage}</span>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* BAGIAN 1: DATA SEKOLAH (Disamakan dengan Data Sekolah pada Peran Admin Sekolah) */}
              <div>
                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100">
                  <Building2 className="w-4 h-4 text-blue-600" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    1. Data Sekolah (Identitas Satuan Pendidikan)
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  {/* 1. Nama Sekolah */}
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      Nama Sekolah <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="school_name"
                      required
                      placeholder="Contoh: SD Negeri 01 Nusantara"
                      value={formData.school_name}
                      onChange={handleChange}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* 2. NPSN */}
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      NPSN <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="npsn"
                      required
                      maxLength={8}
                      placeholder="Contoh: 20101001 (8 digit angka)"
                      value={formData.npsn}
                      onChange={handleChange}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* 3. Jenjang */}
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Jenjang</label>
                    <select
                      name="education_level"
                      value={formData.education_level}
                      onChange={handleChange}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-semibold focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="SD">SD (Sekolah Dasar)</option>
                      <option value="MI">MI (Madrasah Ibtidaiyah)</option>
                    </select>
                  </div>

                  {/* 4. Status Sekolah */}
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Status Sekolah</label>
                    <select
                      name="school_type"
                      value={formData.school_type}
                      onChange={handleChange}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-semibold focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="negeri">Negeri</option>
                      <option value="swasta">Swasta</option>
                    </select>
                  </div>

                  {/* 5. Alamat Sekolah */}
                  <div className="md:col-span-2">
                    <label className="block text-slate-700 font-semibold mb-1">
                      Alamat Sekolah <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      rows={2}
                      name="address"
                      required
                      placeholder="Masukkan alamat lengkap sekolah..."
                      value={formData.address}
                      onChange={handleChange}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* 6. Nama Kepala Sekolah */}
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      Nama Kepala Sekolah <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="principal_name"
                      required
                      placeholder="Nama lengkap kepala sekolah beserta gelar"
                      value={formData.principal_name}
                      onChange={handleChange}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* 7. NIP Kepala Sekolah */}
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">NIP Kepala Sekolah</label>
                    <input
                      type="text"
                      name="principal_nip"
                      placeholder="Contoh: 197004121994031005 (atau - jika non-PNS)"
                      value={formData.principal_nip || ''}
                      onChange={handleChange}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* 8. Tahun Pelajaran */}
                  <div className="md:col-span-2">
                    <label className="block text-slate-700 font-semibold mb-1">
                      Tahun Pelajaran <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="academic_year"
                      list="register-tahun-pelajaran-list"
                      required
                      placeholder="Contoh: 2025/2026"
                      value={formData.academic_year}
                      onChange={handleChange}
                      className="w-full md:w-1/2 px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    />
                    <datalist id="register-tahun-pelajaran-list">
                      <option value="2024/2025" />
                      <option value="2025/2026" />
                      <option value="2026/2027" />
                    </datalist>
                  </div>

                  {/* 9. Logo Sekolah */}
                  <div className="md:col-span-2">
                    <label className="block text-slate-700 font-semibold mb-2">Logo Sekolah</label>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                      <div className="w-20 h-20 rounded-xl bg-white border border-slate-200 flex items-center justify-center p-2 shrink-0 overflow-hidden shadow-2xs">
                        {formData.logo_url ? (
                          <img
                            src={formData.logo_url}
                            alt="Preview Logo Sekolah"
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <TutWuriLogo size={54} />
                        )}
                      </div>

                      <div className="flex-1 space-y-2">
                        <div className="text-slate-700 font-medium">
                          {formData.logo_url ? 'Logo kustom sekolah aktif' : 'Menggunakan logo default Tut Wuri Handayani'}
                        </div>
                        <p className="text-[11px] text-slate-500">
                          Unggah gambar logo resmi sekolah (PNG, JPG, SVG, atau WEBP, maks. 2 MB). Opsional, dapat diubah kapan saja di menu Data Sekolah.
                        </p>
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg font-semibold cursor-pointer transition shadow-2xs">
                            <Upload className="w-3.5 h-3.5 text-blue-600" />
                            <span>Pilih Logo Sekolah</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleLogoUpload}
                              className="hidden"
                            />
                          </label>
                          {formData.logo_url && (
                            <button
                              type="button"
                              onClick={() => setFormData((prev) => ({ ...prev, logo_url: '' }))}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg font-semibold transition"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Reset ke Default</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* BAGIAN 2: AKUN ADMIN SEKOLAH */}
              <div>
                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    2. Akun Admin Sekolah (Akses Login &amp; Pengelola)
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Nama Lengkap Admin / Operator <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        name="admin_name"
                        required
                        placeholder="Nama penanggung jawab ujian"
                        value={formData.admin_name}
                        onChange={handleChange}
                        className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Nomor Telepon / WhatsApp <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="tel"
                        name="phone"
                        required
                        placeholder="0812xxxxxxxx"
                        value={formData.phone}
                        onChange={handleChange}
                        className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Username / Email Login Sekolah <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        name="email"
                        required
                        placeholder="admin.sdn@kemdikbud.id"
                        value={formData.email}
                        onChange={handleChange}
                        className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <span className="text-[10px] text-slate-400 mt-0.5 block">
                      Digunakan untuk login dan otomatis terdaftar di Data Pengguna Super Admin
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Kata Sandi <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        name="password"
                        required
                        placeholder="Minimal 6 karakter"
                        value={formData.password}
                        onChange={handleChange}
                        className="w-full pl-9 pr-9 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        tabIndex={-1}
                        className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 transition"
                        title={showPassword ? 'Sembunyikan kata sandi' : 'Lihat kata sandi'}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <span className="text-[10px] text-slate-400 mt-0.5 block">
                      Minimal 6 karakter
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Konfirmasi Kata Sandi <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        required
                        placeholder="Ulangi kata sandi"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className={`w-full pl-9 pr-9 py-2 text-xs border rounded-lg focus:outline-hidden focus:ring-2 ${
                          confirmPassword && formData.password !== confirmPassword
                            ? 'border-red-300 focus:ring-red-500'
                            : 'border-slate-300 focus:ring-blue-500'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        tabIndex={-1}
                        className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 transition"
                        title={showConfirmPassword ? 'Sembunyikan konfirmasi' : 'Lihat konfirmasi'}
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {confirmPassword && (
                      <span
                        className={`text-[10px] mt-0.5 block font-medium ${
                          formData.password === confirmPassword ? 'text-emerald-600' : 'text-red-600'
                        }`}
                      >
                        {formData.password === confirmPassword
                          ? 'Kata sandi cocok'
                          : 'Konfirmasi kata sandi tidak cocok'}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Persetujuan */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-600 space-y-1">
                <label className="flex items-start gap-2 cursor-pointer">
                  <input type="checkbox" required className="mt-0.5 rounded text-blue-600 focus:ring-blue-500" />
                  <span>
                    Saya menyatakan data pendaftaran sekolah ini adalah benar dan sah. Saya bersedia mengelola akun ujian digital ini sesuai peraturan evaluasi pendidikan jenjang Sekolah Dasar.
                  </span>
                </label>
              </div>

              {/* Submit Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={onBackToLogin}
                  className="w-full sm:w-auto px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition text-center"
                >
                  Sudah punya akun? Masuk di sini
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    'Memproses Registrasi...'
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Daftarkan Sekolah &amp; Aktifkan Ruang Kerja</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
