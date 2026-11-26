/**
 * EduUjian SD / SINTESA - Auth Context & Multi-Tenant Session Management
 * Mengelola autentikasi 4 peran: super_admin, school_admin, proctor, student
 * Terintegrasi dengan sinkronisasi Supabase PostgreSQL & fallback cache lokal
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserRole, Profile, School, ClassRoom, Subject } from '../types/database';
import { tenantStore, isSupabaseConfigured, supabase, generateUuid, fromDbUuid } from '../lib/supabase';

export interface RegisterSchoolData {
  school_name: string;
  npsn: string;
  education_level: 'SD' | 'MI';
  school_type: 'negeri' | 'swasta';
  address: string;
  principal_name: string;
  principal_nip?: string;
  academic_year: string;
  logo_url?: string;
  province?: string;
  city_regency?: string;
  district?: string;
  admin_name: string;
  email: string;
  phone: string;
  password: string;
}

interface AuthContextType {
  user: (Profile & { role: UserRole }) | null;
  currentSchool: School | null;
  role: UserRole | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  loginStudent: (schoolNpsn: string, nisn: string) => Promise<{ success: boolean; error?: string }>;
  registerSchool: (data: RegisterSchoolData) => Promise<{ success: boolean; error?: string; schoolId?: string }>;
  logout: () => void;
  updateCurrentUser: (updated: Profile & { role: UserRole }) => void;
  resetPassword: (email: string) => Promise<{ success: boolean; message: string }>;
  allSchools: School[];
  refreshSchoolData: () => void;
  syncAllFromSupabase: () => Promise<{ ok: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<(Profile & { role: UserRole }) | null>(null);
  const [currentSchool, setCurrentSchool] = useState<School | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [allSchools, setAllSchools] = useState<School[]>([]);

  const refreshSchoolData = () => {
    const schools = tenantStore.getSchools();
    setAllSchools(schools);
    if (user?.school_id) {
      const current = schools.find((s) => s.id === user.school_id) || null;
      setCurrentSchool(current);
    }
  };

  const syncAllFromSupabase = async () => {
    const res = await tenantStore.syncFromSupabase();
    const schools = tenantStore.getSchools();
    setAllSchools(schools);
    if (user?.school_id) {
      const current = schools.find((s) => s.id === user.school_id) || null;
      setCurrentSchool(current);
    }
    return res;
  };

  useEffect(() => {
    const initAuth = async () => {
      setIsLoading(true);
      if (isSupabaseConfigured) {
        await tenantStore.syncFromSupabase();
      }
      const schools = tenantStore.getSchools();
      setAllSchools(schools);

      const savedUserStr = localStorage.getItem('edujian_active_session');
      if (savedUserStr) {
        try {
          const parsedUser = JSON.parse(savedUserStr);
          setUser(parsedUser);
          if (parsedUser.school_id) {
            const sch = schools.find((s) => s.id === parsedUser.school_id) || null;
            setCurrentSchool(sch);
          }
        } catch {
          localStorage.removeItem('edujian_active_session');
        }
      } else {
        setUser(null);
        setCurrentSchool(null);
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  useEffect(() => {
    if (user?.school_id) {
      const sch = allSchools.find((s) => s.id === user.school_id) || null;
      setCurrentSchool(sch);
    } else {
      setCurrentSchool(null);
    }
  }, [user, allSchools]);

  // Login Email / Username / NISN & Password
  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);

    if (isSupabaseConfigured) {
      await tenantStore.syncFromSupabase();
      setAllSchools(tenantStore.getSchools());
    }

    // 1. Coba via Supabase Auth jika online & terkonfigurasi serta input berbentuk email
    if (isSupabaseConfigured && supabase && email.includes('@')) {
      try {
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (!authError && authData.user) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', authData.user.id)
            .maybeSingle();

          const { data: roleData } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', authData.user.id)
            .maybeSingle();

          if (profileData) {
            const resolvedRole = (roleData?.role || profileData.role || 'school_admin') as UserRole;
            const loggedIn: Profile & { role: UserRole } = {
              id: fromDbUuid(profileData.id),
              school_id: profileData.school_id ? fromDbUuid(profileData.school_id) : null,
              full_name: profileData.full_name,
              email: profileData.email,
              phone: profileData.phone || '',
              avatar_url: profileData.avatar_url || undefined,
              created_at: profileData.created_at,
              updated_at: profileData.updated_at,
              role: resolvedRole,
            };
            setUser(loggedIn);
            localStorage.setItem('edujian_active_session', JSON.stringify(loggedIn));
            setIsLoading(false);
            return { success: true };
          }
        }
      } catch (e) {
        console.warn('Supabase Auth login fallback to profiles store:', e);
      }
    }

    // 2. Autentikasi via Store Multi-Tenant (tersinkron dari Supabase & cache lokal)
    const profiles = tenantStore.getProfiles();
    const inputClean = email.trim().toLowerCase();

    let found = profiles.find((p) => {
      const isEmailMatch = p.email.toLowerCase() === inputClean;
      const isIdMatch = p.id.toLowerCase() === inputClean;
      const isNisnInEmail = p.role === 'student' && p.email.toLowerCase().startsWith(inputClean + '@');
      const isPasswordValid = Boolean(p.password) && p.password === password;
      return (isEmailMatch || isIdMatch || isNisnInEmail) && isPasswordValid;
    });

    // Jika belum memiliki profil khusus, periksa tabel students berdasarkan NISN (password awal default: password123)
    if (!found) {
      const allStudents = tenantStore.getStudents();
      const matchedStudent = allStudents.find(
        (st) => st.nisn.toLowerCase() === inputClean || (st.nis && st.nis.toLowerCase() === inputClean)
      );

      if (matchedStudent) {
        const hasExistingProfile = profiles.some(
          (p) =>
            (matchedStudent.user_id && p.id === matchedStudent.user_id) ||
            p.email.toLowerCase().startsWith(matchedStudent.nisn.toLowerCase() + '@') ||
            p.email.toLowerCase() === matchedStudent.nisn.toLowerCase()
        );
        if (!hasExistingProfile && password === 'password123') {
          const studentSchool = tenantStore.getSchools().find((s) => s.id === matchedStudent.school_id);
          const studentUser: Profile & { role: UserRole; password?: string } = {
            id: matchedStudent.id,
            school_id: matchedStudent.school_id,
            full_name: matchedStudent.full_name,
            email: `${matchedStudent.nisn}@siswa.${studentSchool?.npsn || 'sd'}.id`,
            phone: '',
            role: 'student',
            password: 'password123',
            created_at: matchedStudent.created_at,
            updated_at: matchedStudent.created_at,
          };
          found = studentUser;
        }
      }
    }

    if (!found) {
      setIsLoading(false);
      return { success: false, error: 'Username / ID Pengguna atau kata sandi tidak cocok. Silakan periksa kembali.' };
    }

    // Periksa status sekolah jika bukan super admin
    if (found.school_id) {
      const school = tenantStore.getSchools().find((s) => s.id === found!.school_id);
      if (school && school.status === 'suspended') {
        setIsLoading(false);
        return { success: false, error: 'Akun sekolah sedang dinonaktifkan oleh Administrator Pusat.' };
      }
    }

    setUser(found);
    localStorage.setItem('edujian_active_session', JSON.stringify(found));

    tenantStore.addAuditLog({
      school_id: found.school_id,
      user_id: found.id,
      user_role: found.role,
      user_email: found.email,
      action: 'LOGIN',
      entity_type: 'AUTH',
      entity_id: found.id,
      details: { role: found.role },
    });

    setIsLoading(false);
    return { success: true };
  };

  // Login Khusus Siswa menggunakan NPSN Sekolah + NISN Siswa
  const loginStudent = async (schoolNpsn: string, nisn: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    if (isSupabaseConfigured) {
      await tenantStore.syncFromSupabase();
    }

    const schools = tenantStore.getSchools();
    const school = schools.find((s) => s.npsn === schoolNpsn.trim());

    if (!school) {
      setIsLoading(false);
      return { success: false, error: `Sekolah dengan NPSN ${schoolNpsn} tidak ditemukan.` };
    }

    if (school.status === 'suspended') {
      setIsLoading(false);
      return { success: false, error: 'Akses ujian sekolah ini sedang dinonaktifkan.' };
    }

    const students = tenantStore.getStudents(school.id);
    const student = students.find((st) => st.nisn === nisn.trim());

    if (!student) {
      setIsLoading(false);
      return { success: false, error: `Peserta didik dengan NISN ${nisn} tidak terdaftar di ${school.name}.` };
    }

    const studentUser: Profile & { role: UserRole } = {
      id: student.id,
      school_id: school.id,
      full_name: student.full_name,
      email: `${student.nisn}@siswa.${school.npsn}.id`,
      phone: '',
      role: 'student',
      created_at: student.created_at,
      updated_at: student.created_at,
    };

    setUser(studentUser);
    setCurrentSchool(school);
    localStorage.setItem('edujian_active_session', JSON.stringify(studentUser));

    tenantStore.addAuditLog({
      school_id: school.id,
      user_id: student.id,
      user_role: 'student',
      user_email: studentUser.email,
      action: 'STUDENT_LOGIN',
      entity_type: 'STUDENT',
      entity_id: student.id,
      details: { nisn: student.nisn, school_npsn: school.npsn, class: student.class_name },
    });

    setIsLoading(false);
    return { success: true };
  };

  // Registrasi Otomatis Sekolah Baru (Sinkron ke Supabase + Cache Lokal)
  const registerSchool = async (data: RegisterSchoolData): Promise<{ success: boolean; error?: string; schoolId?: string }> => {
    setIsLoading(true);

    if (isSupabaseConfigured) {
      await tenantStore.syncFromSupabase();
    }

    // Validasi NPSN unik
    const schools = tenantStore.getSchools();
    if (schools.some((s) => s.npsn === data.npsn.trim())) {
      setIsLoading(false);
      return { success: false, error: `NPSN ${data.npsn} sudah terdaftar dalam sistem.` };
    }

    // Validasi Email / Username unik
    const profiles = tenantStore.getProfiles();
    if (profiles.some((p) => p.email.toLowerCase() === data.email.trim().toLowerCase())) {
      setIsLoading(false);
      return { success: false, error: `Username / Email ${data.email} sudah digunakan oleh akun lain.` };
    }

    const newSchoolId = generateUuid();
    let newAdminId = generateUuid();
    const nowIso = new Date().toISOString();

    // Opsional: Daftarkan juga ke Supabase Auth bila berbentuk email dan Supabase aktif
    if (isSupabaseConfigured && supabase && data.email.includes('@')) {
      try {
        const { data: authData } = await supabase.auth.signUp({
          email: data.email.trim(),
          password: data.password,
          options: {
            data: {
              full_name: data.admin_name.trim(),
              role: 'school_admin',
              school_id: newSchoolId,
            },
          },
        });
        if (authData?.user?.id) {
          newAdminId = authData.user.id;
        }
      } catch (err) {
        console.warn('Supabase Auth signUp skipped/fallback:', err);
      }
    }

    const newSchool: School = {
      id: newSchoolId,
      npsn: data.npsn.trim(),
      name: data.school_name.trim(),
      education_level: data.education_level,
      school_type: data.school_type,
      address: data.address.trim(),
      province: data.province?.trim() || 'Indonesia',
      city_regency: data.city_regency?.trim() || '-',
      district: data.district?.trim() || '-',
      phone: data.phone.trim(),
      email: data.email.trim(),
      principal_name: data.principal_name.trim(),
      principal_nip: data.principal_nip?.trim() || '-',
      academic_year: data.academic_year?.trim() || '2025/2026',
      logo_url: data.logo_url || '',
      status: 'active',
      created_at: nowIso,
      updated_at: nowIso,
    };

    const newAdminProfile: Profile & { role: UserRole; password?: string } = {
      id: newAdminId,
      school_id: newSchoolId,
      full_name: data.admin_name.trim(),
      email: data.email.trim(),
      phone: data.phone.trim(),
      role: 'school_admin',
      password: data.password,
      created_at: nowIso,
      updated_at: nowIso,
    };

    const createdClasses: ClassRoom[] = [];
    for (let grade = 1; grade <= 6; grade++) {
      createdClasses.push({
        id: generateUuid(),
        school_id: newSchoolId,
        grade_level: grade as 1 | 2 | 3 | 4 | 5 | 6,
        section: 'A',
        name: `Kelas ${grade}-A`,
        academic_year_id: 'ay-2025-2026',
        created_at: nowIso,
      });
    }

    const defaultSubjects: { code: string; name: string }[] = [
      { code: 'PKN-SD', name: 'Pendidikan Pancasila' },
      { code: 'BIN-SD', name: 'Bahasa Indonesia' },
      { code: 'MAT-SD', name: 'Matematika' },
      { code: 'IPA-SD', name: 'Ilmu Pengetahuan Alam dan Sosial (IPAS)' },
      { code: 'PJK-SD', name: 'Pendidikan Jasmani, Olahraga, dan Kesehatan' },
      { code: 'SBK-SD', name: 'Seni dan Budaya' },
      { code: 'PAI-SD', name: 'Pendidikan Agama dan Budi Pekerti' },
    ];

    const createdSubjects: Subject[] = defaultSubjects.map((sub) => ({
      id: generateUuid(),
      school_id: newSchoolId,
      code: sub.code,
      name: sub.name,
      grade_level: 6,
      created_at: nowIso,
    }));

    // Jika Supabase aktif, simpan secara terverifikasi ke PostgreSQL terlebih dahulu
    if (isSupabaseConfigured) {
      const sbRes = await tenantStore.registerSchoolToSupabase({
        school: newSchool,
        profile: newAdminProfile,
        classes: createdClasses,
        subjects: createdSubjects,
      });
      if (!sbRes.ok) {
        setIsLoading(false);
        return { success: false, error: sbRes.error || 'Gagal menyimpan registrasi ke Supabase.' };
      }
    }

    // Simpan ke store lokal agar langsung sinkron di UI
    tenantStore.saveSchool(newSchool);
    tenantStore.saveProfile(newAdminProfile);
    createdClasses.forEach((cls) => tenantStore.addClass(cls));
    createdSubjects.forEach((sub) => tenantStore.addSubject(sub));

    tenantStore.addAuditLog({
      school_id: newSchoolId,
      user_id: newAdminId,
      user_role: 'school_admin',
      user_email: data.email,
      action: 'AUTOMATIC_SCHOOL_REGISTRATION',
      entity_type: 'SCHOOL',
      entity_id: newSchoolId,
      details: {
        npsn: data.npsn,
        school_name: data.school_name,
        admin_name: data.admin_name,
        default_classes_created: 6,
      },
    });

    const updatedSchools = tenantStore.getSchools();
    setAllSchools(updatedSchools);
    setUser(newAdminProfile);
    setCurrentSchool(newSchool);
    localStorage.setItem('edujian_active_session', JSON.stringify(newAdminProfile));

    setIsLoading(false);
    return { success: true, schoolId: newSchoolId };
  };

  // Logout
  const logout = () => {
    if (user) {
      tenantStore.addAuditLog({
        school_id: user.school_id,
        user_id: user.id,
        user_role: user.role,
        user_email: user.email,
        action: 'LOGOUT',
        entity_type: 'AUTH',
        entity_id: user.id,
      });
    }
    if (isSupabaseConfigured && supabase) {
      supabase.auth.signOut().catch(() => {});
    }
    setUser(null);
    setCurrentSchool(null);
    localStorage.removeItem('edujian_active_session');
  };

  // Perbarui data sesi pengguna aktif (misalnya dari menu Pengaturan Akun)
  const updateCurrentUser = (updated: Profile & { role: UserRole }) => {
    setUser(updated);
    localStorage.setItem('edujian_active_session', JSON.stringify(updated));
  };

  // Reset Password
  const resetPassword = async (email: string): Promise<{ success: boolean; message: string }> => {
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      return { success: false, message: 'Masukkan alamat email atau username yang terdaftar.' };
    }

    if (isSupabaseConfigured) {
      await tenantStore.syncFromSupabase();
    }

    const profiles = tenantStore.getProfiles();
    const match = profiles.find((p) => p.email.toLowerCase() === cleanEmail.toLowerCase());
    if (!match) {
      return { success: false, message: 'Alamat email / username tidak ditemukan dalam pangkalan data.' };
    }

    if (isSupabaseConfigured && supabase && cleanEmail.includes('@')) {
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
          redirectTo: window.location.origin,
        });
        if (!error) {
          return {
            success: true,
            message: `Tautan pemulihan kata sandi telah dikirim ke ${cleanEmail}. Silakan periksa kotak masuk atau folder spam Anda.`,
          };
        }
      } catch (err) {
        console.warn('Supabase resetPasswordForEmail failed:', err);
      }
    }

    return {
      success: false,
      message:
        'Akun ini dikelola secara internal oleh operator. Silakan hubungi Administrator Pusat atau Operator Sekolah untuk melakukan reset kata sandi pada menu Data Pengguna.',
    };
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        currentSchool,
        role: user ? user.role : null,
        isLoading,
        login,
        loginStudent,
        registerSchool,
        logout,
        updateCurrentUser,
        resetPassword,
        allSchools,
        refreshSchoolData,
        syncAllFromSupabase,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
