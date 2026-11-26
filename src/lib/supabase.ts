/**
 * EduUjian SD / SINTESA - Supabase Integration & Multi-Tenant Engine
 * Menyediakan koneksi Supabase Auth & PostgreSQL Database serta sinkronisasi cache lokal
 * dengan isolasi multi-tenant data per school_id.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  School,
  Profile,
  UserRole,
  ClassRoom,
  Student,
  Proctor,
  Subject,
  QuestionBank,
  Exam,
  ExamToken,
  ExamSession,
  AuditLog,
  SchoolStatus,
} from '../types/database';

// ============================================================================
// 1. KONFIGURASI KREDENSIAL SUPABASE (ENV VITE_* / CLOUDFLARE / LOCAL OVERRIDE)
// ============================================================================
export const getSupabaseConfig = () => {
  const envUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

  const customConfig = localStorage.getItem('edujian_supabase_custom_config');
  if (customConfig) {
    try {
      const parsed = JSON.parse(customConfig);
      if (parsed.url && parsed.anonKey) {
        return { url: parsed.url, anonKey: parsed.anonKey, isCustom: true };
      }
    } catch {
      // ignore json parse error
    }
  }

  return { url: envUrl, anonKey: envKey, isCustom: false };
};

export const saveCustomSupabaseConfig = (url: string, anonKey: string) => {
  if (!url || !anonKey) {
    localStorage.removeItem('edujian_supabase_custom_config');
  } else {
    localStorage.setItem(
      'edujian_supabase_custom_config',
      JSON.stringify({ url: url.trim(), anonKey: anonKey.trim() })
    );
  }
};

// 2. Inisialisasi Supabase Client jika kredensial valid
let supabaseInstance: SupabaseClient | null = null;
const config = getSupabaseConfig();

if (config.url && config.anonKey && config.url.startsWith('https://')) {
  try {
    supabaseInstance = createClient(config.url, config.anonKey);
  } catch (err) {
    console.warn('Gagal inisialisasi Supabase SDK:', err);
  }
}

export const supabase = supabaseInstance;
export const isSupabaseConfigured = Boolean(
  config.url && config.anonKey && config.url.startsWith('https://')
);

// ============================================================================
// UUID HELPERS (Kompatibilitas Penuh PostgreSQL UUID <-> Seed Legacy IDs)
// ============================================================================
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isUuid = (value?: string | null): value is string => {
  return Boolean(value && UUID_REGEX.test(value));
};

export const generateUuid = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

const SEED_ID_TO_UUID: Record<string, string> = {};

const UUID_TO_SEED_ID: Record<string, string> = {};

const hashToDeterministicUuid = (input: string): string => {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  let h3 = 0x9e3779b9;
  let h4 = 0x85ebca6b;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761) >>> 0;
    h2 = Math.imul(h2 ^ ch, 1597334677) >>> 0;
    h3 = Math.imul(h3 ^ ch, 2246822519) >>> 0;
    h4 = Math.imul(h4 ^ ch, 3266489917) >>> 0;
  }
  const hex1 = h1.toString(16).padStart(8, '0');
  const hex2 = h2.toString(16).padStart(8, '0');
  const hex3 = h3.toString(16).padStart(8, '0');
  const hex4 = h4.toString(16).padStart(8, '0');
  return `${hex1}-${hex2.slice(0, 4)}-4${hex2.slice(5, 8)}-8${hex3.slice(1, 4)}-${hex3.slice(4, 8)}${hex4}`;
};

export const toDbUuid = (id: string): string => {
  if (isUuid(id)) return id;
  if (SEED_ID_TO_UUID[id]) return SEED_ID_TO_UUID[id];
  return hashToDeterministicUuid(id);
};

export const fromDbUuid = (uuid: string): string => {
  return UUID_TO_SEED_ID[uuid] || uuid;
};

// ============================================================================
// KONFIGURASI BOOTSTRAP PRODUKSI (Hanya 1 Akun Super Admin Awal)
// ============================================================================

export const SUPER_ADMIN_BOOTSTRAP_ID = '20000000-0000-4000-8000-000000000001';

const INITIAL_SCHOOLS: School[] = [];

const INITIAL_PROFILES: (Profile & { role: UserRole; password?: string })[] = [
  {
    id: SUPER_ADMIN_BOOTSTRAP_ID,
    school_id: null,
    full_name: 'Administrator Pusat SINTESA',
    email: 'admin@kemdikbud.edujian.id',
    phone: '',
    role: 'super_admin',
    password: 'password123',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
];

const INITIAL_CLASSES: ClassRoom[] = [];

const INITIAL_STUDENTS: Student[] = [];

const INITIAL_PROCTORS: Proctor[] = [];

const INITIAL_SUBJECTS: Subject[] = [];

const INITIAL_BANKS: QuestionBank[] = [];

const INITIAL_EXAMS: Exam[] = [];

const INITIAL_TOKENS: ExamToken[] = [];

const INITIAL_SESSIONS: ExamSession[] = [];

const INITIAL_LOGS: AuditLog[] = [];

// ============================================================================
// MULTI-TENANT STORE (Sync Otomatis dengan Supabase + Fallback Cache Lokal)
// ============================================================================
class MultiTenantStore {
  private get<T>(key: string, defaultValue: T): T {
    try {
      const data = localStorage.getItem(`edujian_${key}`);
      return data ? JSON.parse(data) : defaultValue;
    } catch {
      return defaultValue;
    }
  }

  private set<T>(key: string, value: T): void {
    try {
      localStorage.setItem(`edujian_${key}`, JSON.stringify(value));
    } catch (e) {
      console.error('Storage full or error', e);
    }
  }

  // Helper konversi record ke format tabel PostgreSQL Supabase
  private toDbSchool(school: School) {
    return {
      id: toDbUuid(school.id),
      npsn: school.npsn,
      name: school.name,
      education_level: school.education_level || 'SD',
      school_type: school.school_type || 'negeri',
      address: school.address || '-',
      province: school.province || '-',
      city_regency: school.city_regency || '-',
      district: school.district || '-',
      postal_code: school.postal_code || null,
      phone: school.phone || null,
      email: school.email,
      principal_name: school.principal_name || '-',
      principal_nip: school.principal_nip || null,
      academic_year: school.academic_year || '2025/2026',
      logo_url: school.logo_url || null,
      status: school.status || 'active',
      created_at: school.created_at || new Date().toISOString(),
      updated_at: school.updated_at || new Date().toISOString(),
    };
  }

  private toDbProfile(profile: Profile & { role: UserRole; password?: string }) {
    return {
      id: toDbUuid(profile.id),
      school_id: profile.school_id ? toDbUuid(profile.school_id) : null,
      full_name: profile.full_name,
      email: profile.email,
      phone: profile.phone || null,
      avatar_url: profile.avatar_url || null,
      role: profile.role || 'student',
      password: profile.password || 'password123',
      created_at: profile.created_at || new Date().toISOString(),
      updated_at: profile.updated_at || new Date().toISOString(),
    };
  }

  private toDbClass(c: ClassRoom) {
    return {
      id: toDbUuid(c.id),
      school_id: toDbUuid(c.school_id),
      academic_year_id: isUuid(c.academic_year_id) ? c.academic_year_id : null,
      grade_level: c.grade_level,
      section: c.section || 'A',
      name: c.name,
      created_at: c.created_at || new Date().toISOString(),
    };
  }

  private toDbStudent(s: Student) {
    return {
      id: toDbUuid(s.id),
      school_id: toDbUuid(s.school_id),
      user_id: s.user_id ? toDbUuid(s.user_id) : null,
      nisn: s.nisn,
      nis: s.nis || null,
      full_name: s.full_name,
      gender: s.gender,
      class_id: s.class_id ? toDbUuid(s.class_id) : null,
      class_name: s.class_name || null,
      birth_date: s.birth_date || null,
      is_active: s.is_active !== false,
      created_at: s.created_at || new Date().toISOString(),
    };
  }

  private toDbProctor(p: Proctor) {
    return {
      id: toDbUuid(p.id),
      school_id: toDbUuid(p.school_id),
      user_id: p.user_id ? toDbUuid(p.user_id) : null,
      nip: p.nip || null,
      full_name: p.full_name,
      phone: p.phone || null,
      is_active: p.is_active !== false,
      created_at: p.created_at || new Date().toISOString(),
    };
  }

  private toDbSubject(sub: Subject) {
    return {
      id: toDbUuid(sub.id),
      school_id: toDbUuid(sub.school_id),
      code: sub.code,
      name: sub.name,
      grade_level: sub.grade_level ?? 6,
      created_at: sub.created_at || new Date().toISOString(),
    };
  }

  private runBg(label: string, promiseLike: PromiseLike<{ error: any }>) {
    if (!isSupabaseConfigured || !supabase) return;
    Promise.resolve(promiseLike)
      .then(({ error }) => {
        if (error) {
          console.warn(`[Supabase Sync ${label}]`, error.message || error);
        }
      })
      .catch((err) => {
        console.warn(`[Supabase Sync ${label}]`, err);
      });
  }

  // Tarik seluruh data multi-tenant dari Supabase dan sinkronkan ke cache lokal
  async syncFromSupabase(): Promise<{ ok: boolean; error?: string }> {
    if (!isSupabaseConfigured || !supabase) {
      return { ok: false, error: 'Supabase belum dikonfigurasi' };
    }

    try {
      const [
        schoolsRes,
        profilesRes,
        classesRes,
        studentsRes,
        proctorsRes,
        subjectsRes,
        banksRes,
        examsRes,
        tokensRes,
        sessionsRes,
        logsRes,
      ] = await Promise.all([
        supabase.from('schools').select('*').order('created_at', { ascending: true }),
        supabase.from('profiles').select('*').order('created_at', { ascending: true }),
        supabase.from('classes').select('*').order('grade_level', { ascending: true }),
        supabase.from('students').select('*').order('created_at', { ascending: true }),
        supabase.from('proctors').select('*').order('created_at', { ascending: true }),
        supabase.from('subjects').select('*').order('created_at', { ascending: true }),
        supabase.from('question_banks').select('*').order('created_at', { ascending: true }),
        supabase.from('exams').select('*').order('created_at', { ascending: true }),
        supabase.from('exam_tokens').select('*').order('created_at', { ascending: true }),
        supabase.from('exam_sessions').select('*').order('created_at', { ascending: true }),
        supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(100),
      ]);

      if (schoolsRes.error) {
        return { ok: false, error: schoolsRes.error.message };
      }

      if (Array.isArray(schoolsRes.data)) {
        const mappedSchools: School[] = schoolsRes.data.map((r: any) => ({
          id: fromDbUuid(r.id),
          npsn: r.npsn,
          name: r.name,
          education_level: (r.education_level as 'SD' | 'MI') || 'SD',
          school_type: (r.school_type as 'negeri' | 'swasta') || 'negeri',
          address: r.address || '',
          province: r.province || '-',
          city_regency: r.city_regency || '-',
          district: r.district || '-',
          postal_code: r.postal_code || undefined,
          phone: r.phone || '',
          email: r.email || '',
          principal_name: r.principal_name || '',
          principal_nip: r.principal_nip || '',
          academic_year: r.academic_year || '2025/2026',
          logo_url: r.logo_url || '',
          status: (r.status as SchoolStatus) || 'active',
          created_at: r.created_at,
          updated_at: r.updated_at,
        }));
        this.set('schools', mappedSchools);
      }

      if (!profilesRes.error && Array.isArray(profilesRes.data)) {
        const mappedProfiles: (Profile & { role: UserRole; password?: string })[] = profilesRes.data.map((r: any) => ({
          id: fromDbUuid(r.id),
          school_id: r.school_id ? fromDbUuid(r.school_id) : null,
          full_name: r.full_name,
          email: r.email,
          phone: r.phone || '',
          avatar_url: r.avatar_url || undefined,
          role: (r.role as UserRole) || 'student',
          password: r.password || 'password123',
          created_at: r.created_at,
          updated_at: r.updated_at,
        }));
        // Pastikan 1 akun Super Admin awal tetap tersedia bila belum ada di tabel profiles Supabase
        const hasSuperAdmin = mappedProfiles.some((p) => p.role === 'super_admin');
        if (!hasSuperAdmin) {
          const localSuperAdmin = this.get<(Profile & { role: UserRole; password?: string })[]>(
            'profiles',
            INITIAL_PROFILES
          ).find((p) => p.role === 'super_admin');
          mappedProfiles.unshift(localSuperAdmin || INITIAL_PROFILES[0]);
        }
        this.set('profiles', mappedProfiles);
      }

      let syncedClasses = this.get<ClassRoom[]>('classes', INITIAL_CLASSES);
      if (!classesRes.error && Array.isArray(classesRes.data)) {
        syncedClasses = classesRes.data.map((r: any) => ({
          id: fromDbUuid(r.id),
          school_id: fromDbUuid(r.school_id),
          grade_level: r.grade_level as 1 | 2 | 3 | 4 | 5 | 6,
          section: r.section || 'A',
          name: r.name,
          academic_year_id: r.academic_year_id ? fromDbUuid(r.academic_year_id) : 'ay-2025-2026',
          created_at: r.created_at,
        }));
        this.set('classes', syncedClasses);
      }

      let syncedStudents = this.get<Student[]>('students', INITIAL_STUDENTS);
      if (!studentsRes.error && Array.isArray(studentsRes.data)) {
        syncedStudents = studentsRes.data.map((r: any) => {
          const cid = r.class_id ? fromDbUuid(r.class_id) : '';
          const cls = syncedClasses.find((c) => c.id === cid);
          return {
            id: fromDbUuid(r.id),
            school_id: fromDbUuid(r.school_id),
            user_id: r.user_id ? fromDbUuid(r.user_id) : null,
            nisn: r.nisn,
            nis: r.nis || undefined,
            full_name: r.full_name,
            gender: (r.gender as 'L' | 'P') || 'L',
            class_id: cid,
            class_name: r.class_name || cls?.name || 'Kelas 6',
            birth_date: r.birth_date || undefined,
            is_active: r.is_active !== false,
            created_at: r.created_at,
          };
        });
        this.set('students', syncedStudents);
      }

      if (!proctorsRes.error && Array.isArray(proctorsRes.data)) {
        const mappedProctors: Proctor[] = proctorsRes.data.map((r: any) => ({
          id: fromDbUuid(r.id),
          school_id: fromDbUuid(r.school_id),
          user_id: r.user_id ? fromDbUuid(r.user_id) : '',
          nip: r.nip || undefined,
          full_name: r.full_name,
          phone: r.phone || undefined,
          is_active: r.is_active !== false,
          created_at: r.created_at,
        }));
        this.set('proctors', mappedProctors);
      }

      let syncedSubjects = this.get<Subject[]>('subjects', INITIAL_SUBJECTS);
      if (!subjectsRes.error && Array.isArray(subjectsRes.data)) {
        syncedSubjects = subjectsRes.data.map((r: any) => ({
          id: fromDbUuid(r.id),
          school_id: fromDbUuid(r.school_id),
          code: r.code,
          name: r.name,
          grade_level: r.grade_level ?? 6,
          created_at: r.created_at,
        }));
        this.set('subjects', syncedSubjects);
      }

      if (!banksRes.error && Array.isArray(banksRes.data)) {
        const mappedBanks: QuestionBank[] = banksRes.data.map((r: any) => ({
          id: fromDbUuid(r.id),
          school_id: fromDbUuid(r.school_id),
          subject_id: fromDbUuid(r.subject_id),
          subject_name: syncedSubjects.find((sub) => sub.id === fromDbUuid(r.subject_id))?.name,
          title: r.title,
          grade_level: r.grade_level,
          description: r.description || undefined,
          created_by: r.created_by ? fromDbUuid(r.created_by) : '',
          total_questions: r.total_questions || 0,
          created_at: r.created_at,
          updated_at: r.updated_at,
        }));
        this.set('question_banks', mappedBanks);
      }

      let syncedExams = this.get<Exam[]>('exams', INITIAL_EXAMS);
      if (!examsRes.error && Array.isArray(examsRes.data)) {
        syncedExams = examsRes.data.map((r: any) => ({
          id: fromDbUuid(r.id),
          school_id: fromDbUuid(r.school_id),
          subject_id: fromDbUuid(r.subject_id),
          subject_name: syncedSubjects.find((sub) => sub.id === fromDbUuid(r.subject_id))?.name,
          question_bank_id: fromDbUuid(r.question_bank_id),
          title: r.title,
          grade_level: r.grade_level,
          duration_minutes: r.duration_minutes,
          passing_grade: Number(r.passing_grade) || 75,
          status: r.status,
          randomize_questions: r.randomize_questions !== false,
          randomize_options: r.randomize_options !== false,
          created_by: r.created_by ? fromDbUuid(r.created_by) : '',
          created_at: r.created_at,
        }));
        this.set('exams', syncedExams);
      }

      if (!tokensRes.error && Array.isArray(tokensRes.data)) {
        const mappedTokens: ExamToken[] = tokensRes.data.map((r: any) => ({
          id: fromDbUuid(r.id),
          school_id: fromDbUuid(r.school_id),
          exam_id: fromDbUuid(r.exam_id),
          token_code: r.token_code,
          valid_until: r.valid_until,
          created_by: r.created_by ? fromDbUuid(r.created_by) : '',
          is_active: r.is_active !== false,
        }));
        this.set('tokens', mappedTokens);
      }

      if (!sessionsRes.error && Array.isArray(sessionsRes.data)) {
        const mappedSessions: ExamSession[] = sessionsRes.data.map((r: any) => {
          const st = syncedStudents.find((s) => s.id === fromDbUuid(r.student_id));
          return {
            id: fromDbUuid(r.id),
            school_id: fromDbUuid(r.school_id),
            exam_id: fromDbUuid(r.exam_id),
            student_id: fromDbUuid(r.student_id),
            student_name: st?.full_name,
            student_nisn: st?.nisn,
            class_name: st?.class_name,
            proctor_id: r.proctor_id ? fromDbUuid(r.proctor_id) : undefined,
            status: r.status,
            started_at: r.started_at || undefined,
            finished_at: r.finished_at || undefined,
            remaining_seconds: r.remaining_seconds,
            ip_address: r.ip_address || undefined,
            browser_info: r.browser_info || undefined,
            created_at: r.created_at,
          };
        });
        this.set('sessions', mappedSessions);
      }

      if (!logsRes.error && Array.isArray(logsRes.data)) {
        const mappedLogs: AuditLog[] = logsRes.data.map((r: any) => ({
          id: fromDbUuid(r.id),
          school_id: r.school_id ? fromDbUuid(r.school_id) : null,
          user_id: fromDbUuid(r.user_id),
          user_role: r.user_role as UserRole,
          user_email: r.user_email,
          action: r.action,
          entity_type: r.entity_type,
          entity_id: r.entity_id || undefined,
          details: r.details || undefined,
          ip_address: r.ip_address || undefined,
          created_at: r.created_at,
        }));
        this.set('audit_logs', mappedLogs);
      }

      return { ok: true };
    } catch (err: any) {
      console.warn('Supabase syncFromSupabase error:', err);
      return { ok: false, error: err?.message || 'Gagal sinkronisasi dengan Supabase' };
    }
  }

  // Registrasi sekolah baru secara atomik ke Supabase (saat Supabase dikonfigurasi)
  async registerSchoolToSupabase(params: {
    school: School;
    profile: Profile & { role: UserRole; password?: string };
    classes: ClassRoom[];
    subjects: Subject[];
  }): Promise<{ ok: boolean; error?: string }> {
    if (!isSupabaseConfigured || !supabase) {
      return { ok: true };
    }

    const { error: schoolErr } = await supabase
      .from('schools')
      .upsert(this.toDbSchool(params.school), { onConflict: 'id' });
    if (schoolErr) {
      return { ok: false, error: `Gagal menyimpan sekolah ke Supabase: ${schoolErr.message}` };
    }

    const { error: profErr } = await supabase
      .from('profiles')
      .upsert(this.toDbProfile(params.profile), { onConflict: 'id' });
    if (profErr) {
      return { ok: false, error: `Gagal menyimpan akun admin ke Supabase: ${profErr.message}` };
    }

    await supabase.from('user_roles').upsert(
      {
        id: generateUuid(),
        user_id: toDbUuid(params.profile.id),
        role: params.profile.role,
        school_id: toDbUuid(params.school.id),
      },
      { onConflict: 'user_id,role' }
    );

    if (params.classes.length > 0) {
      await supabase
        .from('classes')
        .upsert(params.classes.map((c) => this.toDbClass(c)), { onConflict: 'id' });
    }

    if (params.subjects.length > 0) {
      await supabase
        .from('subjects')
        .upsert(params.subjects.map((sub) => this.toDbSubject(sub)), { onConflict: 'id' });
    }

    return { ok: true };
  }

  // Schools
  getSchools(): School[] {
    return this.get<School[]>('schools', INITIAL_SCHOOLS);
  }

  getSchoolById(id?: string | null): School | undefined {
    if (!id) return undefined;
    return this.getSchools().find((s) => s.id === id);
  }

  saveSchool(school: School): void {
    const schools = this.getSchools();
    const existingIndex = schools.findIndex((s) => s.id === school.id);
    const updatedSchool: School =
      existingIndex >= 0
        ? { ...schools[existingIndex], ...school, updated_at: new Date().toISOString() }
        : school;

    if (existingIndex >= 0) {
      schools[existingIndex] = updatedSchool;
    } else {
      schools.push(updatedSchool);
    }
    this.set('schools', schools);

    if (isSupabaseConfigured && supabase) {
      this.runBg(
        'saveSchool',
        supabase.from('schools').upsert(this.toDbSchool(updatedSchool), { onConflict: 'id' })
      );
    }
  }

  updateSchoolStatus(schoolId: string, status: SchoolStatus, note?: string): void {
    const schools = this.getSchools();
    const idx = schools.findIndex((s) => s.id === schoolId);
    if (idx >= 0) {
      const updatedAt = new Date().toISOString();
      schools[idx] = { ...schools[idx], status, updated_at: updatedAt };
      this.set('schools', schools);

      if (isSupabaseConfigured && supabase) {
        this.runBg(
          'updateSchoolStatus',
          supabase
            .from('schools')
            .update({ status, updated_at: updatedAt })
            .eq('id', toDbUuid(schoolId))
        );
      }

      this.addAuditLog({
        school_id: schoolId,
        user_id: SUPER_ADMIN_BOOTSTRAP_ID,
        user_role: 'super_admin',
        user_email: 'admin@kemdikbud.edujian.id',
        action: 'UPDATE_SCHOOL_STATUS',
        entity_type: 'SCHOOL',
        entity_id: schoolId,
        details: { new_status: status, note: note || 'Diperbarui oleh Superadmin' },
      });
    }
  }

  deleteSchool(schoolId: string): void {
    let schools = this.getSchools();
    schools = schools.filter((s) => s.id !== schoolId);
    this.set('schools', schools);

    if (isSupabaseConfigured && supabase) {
      this.runBg(
        'deleteSchool',
        supabase.from('schools').delete().eq('id', toDbUuid(schoolId))
      );
    }
  }

  // Profiles & Users
  getProfiles(): (Profile & { role: UserRole; password?: string })[] {
    return this.get('profiles', INITIAL_PROFILES);
  }

  saveProfile(profile: Profile & { role: UserRole; password?: string }): void {
    const list = this.getProfiles();
    const idx = list.findIndex((p) => p.id === profile.id || p.email.toLowerCase() === profile.email.toLowerCase());
    const savedProfile = idx >= 0 ? { ...list[idx], ...profile } : profile;

    if (idx >= 0) {
      list[idx] = savedProfile;
    } else {
      list.push(savedProfile);
    }
    this.set('profiles', list);

    if (isSupabaseConfigured && supabase) {
      this.runBg(
        'saveProfile',
        supabase
          .from('profiles')
          .upsert(this.toDbProfile(savedProfile), { onConflict: 'id' })
          .then(async (res) => {
            if (!res.error && supabase) {
              await supabase.from('user_roles').upsert(
                {
                  id: generateUuid(),
                  user_id: toDbUuid(savedProfile.id),
                  role: savedProfile.role,
                  school_id: savedProfile.school_id ? toDbUuid(savedProfile.school_id) : null,
                },
                { onConflict: 'user_id,role' }
              );
            }
            return res;
          })
      );
    }
  }

  deleteProfile(profileId: string): void {
    const list = this.getProfiles();
    const filtered = list.filter((p) => p.id !== profileId);
    this.set('profiles', filtered);

    if (isSupabaseConfigured && supabase) {
      this.runBg(
        'deleteProfile',
        supabase.from('profiles').delete().eq('id', toDbUuid(profileId))
      );
    }
  }

  // Classes (Filtered by School ID)
  getClasses(schoolId?: string | null): ClassRoom[] {
    const all = this.get<ClassRoom[]>('classes', INITIAL_CLASSES);
    if (!schoolId) return all;
    return all.filter((c) => c.school_id === schoolId);
  }

  addClass(classroom: ClassRoom): void {
    const list = this.get<ClassRoom[]>('classes', INITIAL_CLASSES);
    list.push(classroom);
    this.set('classes', list);

    if (isSupabaseConfigured && supabase) {
      this.runBg(
        'addClass',
        supabase.from('classes').upsert(this.toDbClass(classroom), { onConflict: 'id' })
      );
    }
  }

  updateClass(classroom: ClassRoom): void {
    const list = this.get<ClassRoom[]>('classes', INITIAL_CLASSES);
    const idx = list.findIndex((c) => c.id === classroom.id);
    if (idx >= 0) {
      const updated = { ...list[idx], ...classroom };
      list[idx] = updated;
      this.set('classes', list);

      if (isSupabaseConfigured && supabase) {
        this.runBg(
          'updateClass',
          supabase.from('classes').upsert(this.toDbClass(updated), { onConflict: 'id' })
        );
      }
    }
  }

  deleteClass(classId: string): void {
    const list = this.get<ClassRoom[]>('classes', INITIAL_CLASSES);
    const filtered = list.filter((c) => c.id !== classId);
    this.set('classes', filtered);

    if (isSupabaseConfigured && supabase) {
      this.runBg(
        'deleteClass',
        supabase.from('classes').delete().eq('id', toDbUuid(classId))
      );
    }
  }

  // Students
  getStudents(schoolId?: string | null): Student[] {
    const all = this.get<Student[]>('students', INITIAL_STUDENTS);
    if (!schoolId) return all;
    return all.filter((s) => s.school_id === schoolId);
  }

  addStudent(student: Student): void {
    const list = this.get<Student[]>('students', INITIAL_STUDENTS);
    list.push(student);
    this.set('students', list);

    if (isSupabaseConfigured && supabase) {
      this.runBg(
        'addStudent',
        supabase.from('students').upsert(this.toDbStudent(student), { onConflict: 'id' })
      );
    }
  }

  updateStudent(student: Student): void {
    const list = this.get<Student[]>('students', INITIAL_STUDENTS);
    const idx = list.findIndex((s) => s.id === student.id);
    if (idx >= 0) {
      const updated = { ...list[idx], ...student };
      list[idx] = updated;
      this.set('students', list);

      if (isSupabaseConfigured && supabase) {
        this.runBg(
          'updateStudent',
          supabase.from('students').upsert(this.toDbStudent(updated), { onConflict: 'id' })
        );
      }
    }
  }

  deleteStudent(studentId: string): void {
    const list = this.get<Student[]>('students', INITIAL_STUDENTS);
    const filtered = list.filter((s) => s.id !== studentId);
    this.set('students', filtered);

    if (isSupabaseConfigured && supabase) {
      this.runBg(
        'deleteStudent',
        supabase.from('students').delete().eq('id', toDbUuid(studentId))
      );
    }
  }

  // Proctors
  getProctors(schoolId?: string | null): Proctor[] {
    const all = this.get<Proctor[]>('proctors', INITIAL_PROCTORS);
    if (!schoolId) return all;
    return all.filter((p) => p.school_id === schoolId);
  }

  addProctor(proctor: Proctor): void {
    const list = this.get<Proctor[]>('proctors', INITIAL_PROCTORS);
    list.push(proctor);
    this.set('proctors', list);

    if (isSupabaseConfigured && supabase) {
      this.runBg(
        'addProctor',
        supabase.from('proctors').upsert(this.toDbProctor(proctor), { onConflict: 'id' })
      );
    }
  }

  deleteProctor(proctorId: string): void {
    const list = this.get<Proctor[]>('proctors', INITIAL_PROCTORS);
    const filtered = list.filter((p) => p.id !== proctorId);
    this.set('proctors', filtered);

    if (isSupabaseConfigured && supabase) {
      this.runBg(
        'deleteProctor',
        supabase.from('proctors').delete().eq('id', toDbUuid(proctorId))
      );
    }
  }

  // Subjects
  getSubjects(schoolId?: string | null): Subject[] {
    const all = this.get<Subject[]>('subjects', INITIAL_SUBJECTS);
    if (!schoolId) return all;
    return all.filter((s) => s.school_id === schoolId);
  }

  addSubject(subject: Subject): void {
    const list = this.get<Subject[]>('subjects', INITIAL_SUBJECTS);
    list.push(subject);
    this.set('subjects', list);

    if (isSupabaseConfigured && supabase) {
      this.runBg(
        'addSubject',
        supabase.from('subjects').upsert(this.toDbSubject(subject), { onConflict: 'id' })
      );
    }
  }

  // Question Banks
  getQuestionBanks(schoolId?: string | null): QuestionBank[] {
    const all = this.get<QuestionBank[]>('question_banks', INITIAL_BANKS);
    if (!schoolId) return all;
    return all.filter((qb) => qb.school_id === schoolId);
  }

  addQuestionBank(qb: QuestionBank): void {
    const list = this.get<QuestionBank[]>('question_banks', INITIAL_BANKS);
    list.push(qb);
    this.set('question_banks', list);

    if (isSupabaseConfigured && supabase) {
      this.runBg(
        'addQuestionBank',
        supabase.from('question_banks').upsert(
          {
            id: toDbUuid(qb.id),
            school_id: toDbUuid(qb.school_id),
            subject_id: toDbUuid(qb.subject_id),
            title: qb.title,
            grade_level: qb.grade_level,
            description: qb.description || null,
            created_by: qb.created_by ? toDbUuid(qb.created_by) : null,
            total_questions: qb.total_questions,
            created_at: qb.created_at,
            updated_at: qb.updated_at,
          },
          { onConflict: 'id' }
        )
      );
    }
  }

  // Exams
  getExams(schoolId?: string | null): Exam[] {
    const all = this.get<Exam[]>('exams', INITIAL_EXAMS);
    if (!schoolId) return all;
    return all.filter((e) => e.school_id === schoolId);
  }

  addExam(exam: Exam): void {
    const list = this.get<Exam[]>('exams', INITIAL_EXAMS);
    list.push(exam);
    this.set('exams', list);

    if (isSupabaseConfigured && supabase) {
      this.runBg(
        'addExam',
        supabase.from('exams').upsert(
          {
            id: toDbUuid(exam.id),
            school_id: toDbUuid(exam.school_id),
            subject_id: toDbUuid(exam.subject_id),
            question_bank_id: toDbUuid(exam.question_bank_id),
            title: exam.title,
            grade_level: exam.grade_level,
            duration_minutes: exam.duration_minutes,
            passing_grade: exam.passing_grade,
            status: exam.status,
            randomize_questions: exam.randomize_questions,
            randomize_options: exam.randomize_options,
            created_by: exam.created_by ? toDbUuid(exam.created_by) : null,
            created_at: exam.created_at,
          },
          { onConflict: 'id' }
        )
      );
    }
  }

  // Tokens
  getTokens(schoolId?: string | null): ExamToken[] {
    const all = this.get<ExamToken[]>('tokens', INITIAL_TOKENS);
    if (!schoolId) return all;
    return all.filter((t) => t.school_id === schoolId);
  }

  addToken(token: ExamToken): void {
    const list = this.get<ExamToken[]>('tokens', INITIAL_TOKENS);
    list.push(token);
    this.set('tokens', list);

    if (isSupabaseConfigured && supabase) {
      this.runBg(
        'addToken',
        supabase.from('exam_tokens').upsert(
          {
            id: toDbUuid(token.id),
            school_id: toDbUuid(token.school_id),
            exam_id: toDbUuid(token.exam_id),
            token_code: token.token_code,
            valid_until: token.valid_until,
            created_by: token.created_by ? toDbUuid(token.created_by) : null,
            is_active: token.is_active,
          },
          { onConflict: 'id' }
        )
      );
    }
  }

  // Exam Sessions
  getSessions(schoolId?: string | null): ExamSession[] {
    const all = this.get<ExamSession[]>('sessions', INITIAL_SESSIONS);
    if (!schoolId) return all;
    return all.filter((s) => s.school_id === schoolId);
  }

  updateSession(session: ExamSession): void {
    const list = this.get<ExamSession[]>('sessions', INITIAL_SESSIONS);
    const idx = list.findIndex((s) => s.id === session.id);
    if (idx >= 0) {
      list[idx] = session;
    } else {
      list.push(session);
    }
    this.set('sessions', list);

    if (isSupabaseConfigured && supabase) {
      this.runBg(
        'updateSession',
        supabase.from('exam_sessions').upsert(
          {
            id: toDbUuid(session.id),
            school_id: toDbUuid(session.school_id),
            exam_id: toDbUuid(session.exam_id),
            student_id: toDbUuid(session.student_id),
            proctor_id: session.proctor_id ? toDbUuid(session.proctor_id) : null,
            status: session.status,
            started_at: session.started_at || null,
            finished_at: session.finished_at || null,
            remaining_seconds: session.remaining_seconds,
            ip_address: session.ip_address || null,
            browser_info: session.browser_info || null,
            created_at: session.created_at,
          },
          { onConflict: 'id' }
        )
      );
    }
  }

  // Audit Logs
  getAuditLogs(schoolId?: string | null): AuditLog[] {
    const all = this.get<AuditLog[]>('audit_logs', INITIAL_LOGS);
    if (!schoolId) return all;
    return all.filter((l) => l.school_id === schoolId || l.school_id === null);
  }

  addAuditLog(log: Omit<AuditLog, 'id' | 'created_at'>): AuditLog {
    const newLog: AuditLog = {
      ...log,
      id: generateUuid(),
      created_at: new Date().toISOString(),
    };
    const list = this.get<AuditLog[]>('audit_logs', INITIAL_LOGS);
    list.unshift(newLog);
    this.set('audit_logs', list);

    if (isSupabaseConfigured && supabase) {
      this.runBg(
        'addAuditLog',
        supabase.from('audit_logs').insert({
          id: newLog.id,
          school_id: newLog.school_id ? toDbUuid(newLog.school_id) : null,
          user_id: toDbUuid(newLog.user_id),
          user_role: newLog.user_role,
          user_email: newLog.user_email,
          action: newLog.action,
          entity_type: newLog.entity_type,
          entity_id: newLog.entity_id || null,
          details: newLog.details || null,
          ip_address: newLog.ip_address || null,
          created_at: newLog.created_at,
        })
      );
    }

    return newLog;
  }
}

export const tenantStore = new MultiTenantStore();
