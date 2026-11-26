import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { UserRole } from '../../types/database';
import {
  GraduationCap,
  Building2,
  Shield,
  UserCheck,
  BookOpen,
  LogOut,
  User,
  School as SchoolIcon,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, currentSchool, role, logout } = useAuth();

  const getRoleBadge = (r: UserRole | null) => {
    switch (r) {
      case 'super_admin':
        return { label: 'Super Admin Pusat', bg: 'bg-purple-100 text-purple-700 border-purple-200', icon: Shield };
      case 'school_admin':
        return { label: 'Admin Sekolah', bg: 'bg-blue-100 text-blue-700 border-blue-200', icon: Building2 };
      case 'proctor':
        return { label: 'Proktor / Pengawas', bg: 'bg-amber-100 text-amber-700 border-amber-200', icon: UserCheck };
      case 'student':
        return { label: 'Peserta Ujian (Siswa)', bg: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: GraduationCap };
      default:
        return { label: 'Pengguna', bg: 'bg-slate-100 text-slate-700 border-slate-200', icon: User };
    }
  };

  const currentRoleBadge = getRoleBadge(role);
  const RoleIcon = currentRoleBadge.icon;

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand & School Context */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 to-indigo-600 flex items-center justify-center text-white shadow-sm font-bold">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight text-slate-900">
                  SINTESA<span className="text-blue-600 font-bold ml-1">CBT</span>
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">
                  Multi-Tenant
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium leading-none mt-0.5">
                Sistem Informasi Tes dan Asesmen
              </p>
            </div>
          </div>

          {/* School Badge Info */}
          <div className="hidden lg:flex items-center border-l border-slate-200 pl-4 ml-1">
            {currentSchool ? (
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-50 text-blue-700 rounded-lg">
                  <SchoolIcon className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-800 leading-tight">
                    {currentSchool.name}
                  </div>
                  <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                    <span>NPSN: <span className="font-mono text-slate-700 font-medium">{currentSchool.npsn}</span></span>
                    <span>•</span>
                    <span className="capitalize">{currentSchool.school_type}</span>
                    {currentSchool.city_regency && currentSchool.city_regency !== '-' && (
                      <>
                        <span>•</span>
                        <span>{currentSchool.city_regency}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-purple-50 text-purple-700 rounded-lg">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-800 leading-tight">
                    Pusat Pengendali SINTESA
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Kementerian Pendidikan Dasar & Menengah RI
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Actions: Active Role Badge + User Profile */}
        <div className="flex items-center gap-3">
          <div
            className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 border rounded-lg text-xs font-bold ${currentRoleBadge.bg}`}
          >
            <RoleIcon className="w-3.5 h-3.5" />
            <span>{currentRoleBadge.label}</span>
          </div>

          {/* User Info & Avatar */}
          <div className="flex items-center gap-2.5 pl-2 border-l border-slate-200">
            <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-xs shadow-xs">
              {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="hidden md:block text-left">
              <div className="text-xs font-bold text-slate-800 leading-tight truncate max-w-[150px]">
                {user?.full_name || 'Pengguna'}
              </div>
              <div className="text-[11px] text-slate-500 truncate max-w-[150px]">
                {user?.email || ''}
              </div>
            </div>

            <button
              onClick={logout}
              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
              title="Keluar dari Akun"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
