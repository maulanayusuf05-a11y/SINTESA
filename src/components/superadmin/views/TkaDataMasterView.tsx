import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { tenantStore, generateUuid } from '../../../lib/supabase';
import { School, Subject, QuestionBank, Student, Proctor, Profile, UserRole } from '../../../types/database';
import { TutWuriLogo } from '../../common/TutWuriLogo';
import {
  Building2,
  Users,
  UserCheck,
  UserCog,
  BookOpen,
  FileSpreadsheet,
  Search,
  Plus,
  CheckCircle,
  XCircle,
  Eye,
  EyeOff,
  Copy,
  ArrowLeft,
  Pencil,
  Trash2,
  AlertTriangle,
  X,
  Filter,
  Layers,
  Sparkles,
  Printer,
  RefreshCw,
  Download,
  KeyRound,
  Lock,
  Phone,
  Mail,
  MapPin,
  ChevronRight,
  ShieldCheck,
  AlertCircle,
  QrCode,
  School as SchoolIcon,
} from 'lucide-react';

interface TkaDataMasterViewProps {
  subTab?: string;
  onNavigate?: (sub: string) => void;
}

export const TkaDataMasterView: React.FC<TkaDataMasterViewProps> = ({
  subTab = 'data_sekolah',
  onNavigate,
}) => {
  // Normalize subTab
  const getNormalizedSubTab = (tab?: string) => {
    if (!tab) return 'data_sekolah';
    if (tab === 'schools' || tab === 'data_sekolah' || tab === 'sekolah') return 'data_sekolah';
    if (tab === 'users' || tab === 'data_pengguna' || tab === 'pengguna') return 'data_pengguna';
    if (tab === 'students' || tab === 'data_peserta' || tab === 'peserta') return 'data_peserta';
    if (tab === 'subjects' || tab === 'mapel') return 'subjects';
    if (tab === 'banks' || tab === 'bank_soal') return 'banks';
    return tab;
  };

  const [activeSubTab, setActiveSubTab] = useState<string>(getNormalizedSubTab(subTab));

  useEffect(() => {
    if (subTab) {
      setActiveSubTab(getNormalizedSubTab(subTab));
    }
  }, [subTab]);

  const handleSubTabChange = (tab: string) => {
    setActiveSubTab(tab);
    if (onNavigate) {
      onNavigate(tab);
    }
  };

  // Main Stores State
  const [schools, setSchools] = useState<School[]>(() => tenantStore.getSchools());
  const [profiles, setProfiles] = useState<(Profile & { role: UserRole; password?: string })[]>(() =>
    tenantStore.getProfiles()
  );
  const [proctors, setProctors] = useState<Proctor[]>(() => tenantStore.getProctors());
  const [students, setStudents] = useState<Student[]>(() => tenantStore.getStudents());
  const [subjects] = useState<Subject[]>(() => tenantStore.getSubjects());
  const [banks] = useState<QuestionBank[]>(() => tenantStore.getQuestionBanks());

  // Feedback Notification
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setFeedbackToast(msg);
    setTimeout(() => setFeedbackToast(null), 3500);
  };

  // =========================================================================
  // SUBTAB 1: DATA SEKOLAH STATE & HANDLERS
  // =========================================================================
  const [schoolSearchTerm, setSchoolSearchTerm] = useState('');
  const [schoolStatusFilter, setSchoolStatusFilter] = useState<'all' | 'active' | 'pending' | 'suspended'>('all');
  const [schoolTypeFilter, setSchoolTypeFilter] = useState<'all' | 'negeri' | 'swasta'>('all');
  const [selectedSchoolDetail, setSelectedSchoolDetail] = useState<School | null>(null);

  // Modal Add School
  const [showAddSchoolModal, setShowAddSchoolModal] = useState(false);
  const [newNpsn, setNewNpsn] = useState('');
  const [newSchoolName, setNewSchoolName] = useState('');
  const [newLevel, setNewLevel] = useState<'SD' | 'MI'>('SD');
  const [newType, setNewType] = useState<'negeri' | 'swasta'>('negeri');
  const [newAddress, setNewAddress] = useState('');
  const [newCity, setNewCity] = useState('Kota Jakarta Pusat');
  const [newProvince, setNewProvince] = useState('DKI Jakarta');
  const [newPrincipal, setNewPrincipal] = useState('');
  const [newSchoolEmail, setNewSchoolEmail] = useState('');
  const [newSchoolPhone, setNewSchoolPhone] = useState('');

  const handleToggleSchoolStatus = (school: School) => {
    const nextStatus = school.status === 'active' ? 'suspended' : 'active';
    tenantStore.updateSchoolStatus(
      school.id,
      nextStatus as any,
      `Status diubah menjadi ${nextStatus} oleh Superadmin Pusat`
    );
    const updatedSchools = tenantStore.getSchools();
    setSchools(updatedSchools);
    showToast(`Status ${school.name} berhasil diubah menjadi ${nextStatus.toUpperCase()}`);
  };

  const handleCreateSchool = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNpsn.trim() || !newSchoolName.trim()) {
      showToast('NPSN dan Nama Sekolah wajib diisi!');
      return;
    }

    if (schools.some((s) => s.npsn === newNpsn.trim())) {
      showToast('NPSN sudah terdaftar dalam sistem!');
      return;
    }

    const newId = generateUuid();
    const now = new Date().toISOString();
    const createdSchool: School = {
      id: newId,
      npsn: newNpsn.trim(),
      name: newSchoolName.trim(),
      education_level: newLevel,
      school_type: newType,
      address: newAddress.trim() || '-',
      province: newProvince,
      city_regency: newCity,
      district: '-',
      email: newSchoolEmail.trim() || `admin.${newNpsn.trim()}@sekolah.id`,
      phone: newSchoolPhone.trim() || '-',
      principal_name: newPrincipal.trim() || '-',
      status: 'active',
      created_at: now,
      updated_at: now,
    };

    tenantStore.saveSchool(createdSchool);

    // Auto-create default admin account for this school
    const adminProfile: Profile & { role: UserRole; password?: string } = {
      id: generateUuid(),
      school_id: newId,
      full_name: `Admin ${createdSchool.name}`,
      email: createdSchool.email,
      phone: createdSchool.phone || '',
      role: 'school_admin',
      password: 'password123',
      created_at: now,
      updated_at: now,
    };
    tenantStore.saveProfile(adminProfile);

    // Refresh state
    setSchools(tenantStore.getSchools());
    setProfiles(tenantStore.getProfiles());
    setShowAddSchoolModal(false);
    setNewNpsn('');
    setNewSchoolName('');
    setNewPrincipal('');
    setNewAddress('');
    setNewSchoolEmail('');
    setNewSchoolPhone('');
    showToast(`Sekolah ${createdSchool.name} berhasil didaftarkan dan akun Admin Sekolah aktif.`);
  };

  const filteredSchools = schools.filter((sch) => {
    const matchSearch =
      sch.name.toLowerCase().includes(schoolSearchTerm.toLowerCase()) ||
      sch.npsn.includes(schoolSearchTerm) ||
      sch.city_regency.toLowerCase().includes(schoolSearchTerm.toLowerCase());
    const matchStatus = schoolStatusFilter === 'all' || sch.status === schoolStatusFilter;
    const matchType = schoolTypeFilter === 'all' || sch.school_type === schoolTypeFilter;
    return matchSearch && matchStatus && matchType;
  });

  // =========================================================================
  // SUBTAB 2: DATA PENGGUNA STATE & HANDLERS (Sekolah -> Peran -> Akun)
  // =========================================================================
  interface SchoolAccountRow {
    rowKey: string;
    sourceType: 'profile' | 'proctor' | 'student';
    profileId?: string;
    proctorId?: string;
    studentId?: string;
    schoolId: string | null;
    role: UserRole;
    fullName: string;
    subtitle?: string;
    username: string;
    password: string;
    phone?: string;
  }

  const [selectedUserSchoolId, setSelectedUserSchoolId] = useState<string | null>(null);
  const [selectedUserRole, setSelectedUserRole] = useState<'school_admin' | 'proctor' | 'student'>('school_admin');
  const [userSchoolSearch, setUserSchoolSearch] = useState('');
  const [userAccountSearch, setUserAccountSearch] = useState('');
  const [showCenterAdmins, setShowCenterAdmins] = useState(false);
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});

  // Modal Add User
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('proctor');
  const [newUserSchoolId, setNewUserSchoolId] = useState<string>(schools[0]?.id || '');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [newUserNipNisn, setNewUserNipNisn] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('password123');

  // Modal Edit & Delete User
  const [editingAccount, setEditingAccount] = useState<SchoolAccountRow | null>(null);
  const [editAccName, setEditAccName] = useState('');
  const [editAccUsername, setEditAccUsername] = useState('');
  const [editAccPassword, setEditAccPassword] = useState('');
  const [accountToDelete, setAccountToDelete] = useState<SchoolAccountRow | null>(null);

  const buildAccountsForSchoolRole = (
    schoolId: string,
    role: 'school_admin' | 'proctor' | 'student'
  ): SchoolAccountRow[] => {
    const sch = schools.find((s) => s.id === schoolId);
    const schoolProfiles = profiles.filter((p) => p.school_id === schoolId && p.role === role);

    if (role === 'school_admin') {
      return schoolProfiles.map((p) => ({
        rowKey: `prof-${p.id}`,
        sourceType: 'profile',
        profileId: p.id,
        schoolId,
        role: 'school_admin',
        fullName: p.full_name,
        subtitle: p.phone ? `Telp: ${p.phone}` : 'Admin Satuan Pendidikan',
        username: p.email,
        password: p.password || 'password123',
        phone: p.phone,
      }));
    }

    if (role === 'proctor') {
      const rows: SchoolAccountRow[] = schoolProfiles.map((p) => {
        const linkedProc = proctors.find((pr) => pr.user_id === p.id && pr.school_id === schoolId);
        return {
          rowKey: `prof-${p.id}`,
          sourceType: 'profile',
          profileId: p.id,
          proctorId: linkedProc?.id,
          schoolId,
          role: 'proctor',
          fullName: p.full_name,
          subtitle: linkedProc?.nip ? `NIP: ${linkedProc.nip}` : 'Pengawas / Proktor Lab',
          username: p.email,
          password: p.password || 'password123',
          phone: p.phone || linkedProc?.phone,
        };
      });

      const schoolProctors = proctors.filter((pr) => pr.school_id === schoolId);
      schoolProctors.forEach((pr) => {
        const alreadyLinked = rows.some(
          (r) => r.proctorId === pr.id || (pr.user_id && r.profileId === pr.user_id)
        );
        if (!alreadyLinked) {
          rows.push({
            rowKey: `proc-${pr.id}`,
            sourceType: 'proctor',
            proctorId: pr.id,
            schoolId,
            role: 'proctor',
            fullName: pr.full_name,
            subtitle: pr.nip ? `NIP: ${pr.nip}` : 'Pengawas / Proktor Lab',
            username: pr.nip ? `proktor.${pr.nip}` : `proktor@${sch?.npsn || 'sekolah'}.sch.id`,
            password: 'password123',
            phone: pr.phone,
          });
        }
      });

      return rows;
    }

    // role === 'student'
    const schoolStudents = students.filter((st) => st.school_id === schoolId);
    const rows: SchoolAccountRow[] = schoolStudents.map((st) => {
      const linkedProfile = schoolProfiles.find(
        (p) =>
          (st.user_id && p.id === st.user_id) ||
          p.email.toLowerCase().startsWith(st.nisn.toLowerCase() + '@') ||
          p.email.toLowerCase() === st.nisn.toLowerCase()
      );

      return {
        rowKey: `stu-${st.id}`,
        sourceType: 'student',
        studentId: st.id,
        profileId: linkedProfile?.id,
        schoolId,
        role: 'student',
        fullName: st.full_name,
        subtitle: `NISN: ${st.nisn}${st.class_name ? ` • ${st.class_name}` : ''}`,
        username: linkedProfile?.email || st.nisn,
        password: linkedProfile?.password || 'password123',
      };
    });

    schoolProfiles.forEach((p) => {
      const alreadyLinked = rows.some((r) => r.profileId === p.id);
      if (!alreadyLinked) {
        rows.push({
          rowKey: `prof-${p.id}`,
          sourceType: 'profile',
          profileId: p.id,
          schoolId,
          role: 'student',
          fullName: p.full_name,
          subtitle: 'Peserta Ujian Terdaftar',
          username: p.email,
          password: p.password || 'password123',
        });
      }
    });

    return rows;
  };

  const handleTogglePasswordVisibility = (rowKey: string) => {
    setVisiblePasswords((prev) => ({ ...prev, [rowKey]: !prev[rowKey] }));
  };

  const handleCopyText = (text: string, label: string) => {
    navigator.clipboard?.writeText(text);
    showToast(`${label} "${text}" disalin ke clipboard.`);
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserEmail.trim()) {
      showToast('Nama dan Username/Email Pengguna wajib diisi!');
      return;
    }

    const now = new Date().toISOString();
    const newUserId = generateUuid();
    const targetSchoolId = newUserRole === 'super_admin' ? null : newUserSchoolId;
    const newProfile: Profile & { role: UserRole; password?: string } = {
      id: newUserId,
      school_id: targetSchoolId,
      full_name: newUserName.trim(),
      email: newUserEmail.trim(),
      phone: newUserPhone.trim(),
      role: newUserRole,
      password: newUserPassword.trim() || 'password123',
      created_at: now,
      updated_at: now,
    };

    tenantStore.saveProfile(newProfile);

    if (newUserRole === 'proctor' && newUserSchoolId) {
      tenantStore.addProctor({
        id: generateUuid(),
        school_id: newUserSchoolId,
        user_id: newUserId,
        nip: newUserNipNisn.trim() || '1988' + Math.floor(Math.random() * 90000000),
        full_name: newUserName.trim(),
        phone: newUserPhone.trim(),
        is_active: true,
        created_at: now,
      });
      setProctors(tenantStore.getProctors());
    }

    if (newUserRole === 'student' && newUserSchoolId) {
      const schoolClasses = tenantStore.getClasses(newUserSchoolId);
      const firstClass = schoolClasses[0];
      const nisnVal = newUserNipNisn.trim() || newUserEmail.trim().split('@')[0];
      tenantStore.addStudent({
        id: generateUuid(),
        school_id: newUserSchoolId,
        user_id: newUserId,
        nisn: nisnVal,
        full_name: newUserName.trim(),
        gender: 'L',
        class_id: firstClass?.id || '',
        class_name: firstClass?.name || 'Kelas 6-A',
        birth_date: '2014-05-15',
        is_active: true,
        created_at: now,
      });
      setStudents(tenantStore.getStudents());
    }

    setProfiles(tenantStore.getProfiles());
    setShowAddUserModal(false);
    setNewUserName('');
    setNewUserEmail('');
    setNewUserPhone('');
    setNewUserNipNisn('');
    setNewUserPassword('password123');
    showToast(`Akun pengguna ${newProfile.full_name} berhasil ditambahkan.`);
  };

  const handleOpenEditAccount = (acc: SchoolAccountRow) => {
    setEditingAccount(acc);
    setEditAccName(acc.fullName);
    setEditAccUsername(acc.username);
    setEditAccPassword(acc.password);
  };

  const handleSaveEditAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAccount || !editAccName.trim() || !editAccUsername.trim()) return;

    const now = new Date().toISOString();
    const existingProfile = editingAccount.profileId
      ? profiles.find((p) => p.id === editingAccount.profileId)
      : undefined;

    const profileId = existingProfile?.id || generateUuid();
    const updatedProfile: Profile & { role: UserRole; password?: string } = {
      id: profileId,
      school_id: editingAccount.schoolId,
      full_name: editAccName.trim(),
      email: editAccUsername.trim(),
      phone: existingProfile?.phone || editingAccount.phone || '',
      role: editingAccount.role,
      password: editAccPassword.trim() || 'password123',
      created_at: existingProfile?.created_at || now,
      updated_at: now,
    };

    tenantStore.saveProfile(updatedProfile);

    if (editingAccount.studentId) {
      const targetStudent = students.find((s) => s.id === editingAccount.studentId);
      if (targetStudent) {
        tenantStore.updateStudent({
          ...targetStudent,
          full_name: editAccName.trim(),
          user_id: profileId,
        });
        setStudents(tenantStore.getStudents());
      }
    }

    setProfiles(tenantStore.getProfiles());
    setEditingAccount(null);
    showToast(`Akun "${updatedProfile.full_name}" berhasil diperbarui.`);
  };

  const handleResetPasswordAccount = (acc: SchoolAccountRow) => {
    const now = new Date().toISOString();
    const existingProfile = acc.profileId
      ? profiles.find((p) => p.id === acc.profileId)
      : undefined;
    const profileId = existingProfile?.id || generateUuid();

    tenantStore.saveProfile({
      id: profileId,
      school_id: acc.schoolId,
      full_name: acc.fullName,
      email: acc.username,
      phone: existingProfile?.phone || acc.phone || '',
      role: acc.role,
      password: 'password123',
      created_at: existingProfile?.created_at || now,
      updated_at: now,
    });

    if (acc.studentId && !existingProfile) {
      const targetStudent = students.find((s) => s.id === acc.studentId);
      if (targetStudent) {
        tenantStore.updateStudent({ ...targetStudent, user_id: profileId });
        setStudents(tenantStore.getStudents());
      }
    }

    setProfiles(tenantStore.getProfiles());
    showToast(`Password untuk "${acc.fullName}" direset ke: password123`);
  };

  const handleConfirmDeleteAccount = () => {
    if (!accountToDelete) return;
    if (accountToDelete.profileId) {
      tenantStore.deleteProfile(accountToDelete.profileId);
    }
    if (accountToDelete.proctorId) {
      tenantStore.deleteProctor(accountToDelete.proctorId);
    }
    if (accountToDelete.studentId) {
      tenantStore.deleteStudent(accountToDelete.studentId);
    }
    setProfiles(tenantStore.getProfiles());
    setProctors(tenantStore.getProctors());
    setStudents(tenantStore.getStudents());
    const name = accountToDelete.fullName;
    setAccountToDelete(null);
    showToast(`Akun "${name}" berhasil dihapus.`);
  };

  const handleExportSchoolRoleAccounts = (school: School, role: 'school_admin' | 'proctor' | 'student') => {
    const rows = buildAccountsForSchoolRole(school.id, role);
    const roleLabel =
      role === 'school_admin' ? 'Admin_Sekolah' : role === 'proctor' ? 'Pengawas_Proktor' : 'Peserta_Ujian';
    const sheetData = [
      ['No', 'Nama Lengkap', 'Keterangan', 'Username', 'Password'],
      ...rows.map((r, i) => [i + 1, r.fullName, r.subtitle || '', r.username, r.password]),
    ];
    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    ws['!cols'] = [{ wch: 6 }, { wch: 28 }, { wch: 26 }, { wch: 30 }, { wch: 16 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, roleLabel);
    XLSX.writeFile(wb, `Akun_${roleLabel}_${school.npsn}.xlsx`);
    showToast(`Daftar akun ${roleLabel.replace('_', ' ')} (${school.name}) berhasil diunduh.`);
  };

  // Helper getters for users
  const getSchoolName = (schoolId: string | null) => {
    if (!schoolId) return 'Pusat (Kemdikbud)';
    const found = schools.find((s) => s.id === schoolId);
    return found ? found.name : 'Sekolah Dasar';
  };

  const getSchoolNpsn = (schoolId: string | null) => {
    if (!schoolId) return '-';
    const found = schools.find((s) => s.id === schoolId);
    return found ? found.npsn : '-';
  };

  // Calculate user counts
  const adminSchoolsCount = profiles.filter((p) => p.role === 'school_admin').length;
  const proctorsCount = Math.max(proctors.length, profiles.filter((p) => p.role === 'proctor').length);
  const totalUsersCount =
    schools.reduce(
      (sum, sch) =>
        sum +
        buildAccountsForSchoolRole(sch.id, 'school_admin').length +
        buildAccountsForSchoolRole(sch.id, 'proctor').length +
        buildAccountsForSchoolRole(sch.id, 'student').length,
      0
    ) + profiles.filter((p) => p.role === 'super_admin').length;

  const selectedUserSchool = selectedUserSchoolId
    ? schools.find((s) => s.id === selectedUserSchoolId) || null
    : null;

  const filteredUserSchools = schools.filter(
    (s) =>
      s.name.toLowerCase().includes(userSchoolSearch.toLowerCase()) ||
      s.npsn.includes(userSchoolSearch) ||
      s.city_regency.toLowerCase().includes(userSchoolSearch.toLowerCase())
  );

  // =========================================================================
  // SUBTAB 3: DATA PESERTA STATE & HANDLERS
  // =========================================================================
  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  const [studentSchoolFilter, setStudentSchoolFilter] = useState('all');
  const [studentGenderFilter, setStudentGenderFilter] = useState<'all' | 'L' | 'P'>('all');
  const [selectedStudentForCard, setSelectedStudentForCard] = useState<Student | null>(null);

  const filteredStudents = students.filter((st) => {
    const matchSchool = studentSchoolFilter === 'all' || st.school_id === studentSchoolFilter;
    const matchGender = studentGenderFilter === 'all' || st.gender === studentGenderFilter;
    const matchSearch =
      st.full_name.toLowerCase().includes(studentSearchTerm.toLowerCase()) ||
      st.nisn.includes(studentSearchTerm) ||
      (st.nis && st.nis.includes(studentSearchTerm)) ||
      (st.class_name && st.class_name.toLowerCase().includes(studentSearchTerm.toLowerCase()));
    return matchSchool && matchGender && matchSearch;
  });

  return (
    <div className="space-y-4">
      {/* Toast Feedback */}
      {feedbackToast && (
        <div className="fixed top-16 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl border border-slate-700 text-xs sm:text-sm font-semibold flex items-center gap-2 animate-bounce">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{feedbackToast}</span>
        </div>
      )}

      {/* Top Header & Subtab Bar */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span className="w-2.5 h-6 bg-blue-600 rounded-full inline-block"></span>
            Pusat Data Master Nasional SINTESA
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Pangkalan data terpadu satuan pendidikan, rekapitulasi pengguna, dan peserta asesmen
          </p>
        </div>

        {/* Submenu Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar p-1 bg-slate-100/80 rounded-xl border border-slate-200/60">
          {/* Submenu 1: Data Sekolah */}
          <button
            onClick={() => handleSubTabChange('data_sekolah')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
              activeSubTab === 'data_sekolah'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Data Sekolah ({schools.length})</span>
          </button>

          {/* Submenu 2: Data Pengguna */}
          <button
            onClick={() => handleSubTabChange('data_pengguna')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
              activeSubTab === 'data_pengguna'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Data Pengguna ({totalUsersCount})</span>
          </button>

          {/* Submenu 3: Data Peserta */}
          <button
            onClick={() => handleSubTabChange('data_peserta')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
              activeSubTab === 'data_peserta'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Data Peserta ({students.length})</span>
          </button>

          {/* Secondary Subtabs: Mata Pelajaran & Bank Soal */}
          <button
            onClick={() => handleSubTabChange('subjects')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
              activeSubTab === 'subjects'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Mapel</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          VIEW 1: DATA SEKOLAH (Sekolah yang Terdaftar)
         ========================================================================= */}
      {activeSubTab === 'data_sekolah' && (
        <div className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <div className="text-[11px] font-bold text-slate-500 uppercase">Total Sekolah Terdaftar</div>
              <div className="text-2xl font-black text-slate-900 mt-1">{schools.length}</div>
              <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">
                {schools.filter((s) => s.status === 'active').length} Sekolah Aktif
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <div className="text-[11px] font-bold text-slate-500 uppercase">Sekolah Negeri</div>
              <div className="text-2xl font-black text-blue-700 mt-1">
                {schools.filter((s) => s.school_type === 'negeri').length}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Satuan Pendidikan Negeri</div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <div className="text-[11px] font-bold text-slate-500 uppercase">Sekolah Swasta</div>
              <div className="text-2xl font-black text-indigo-700 mt-1">
                {schools.filter((s) => s.school_type === 'swasta').length}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Satuan Pendidikan Swasta</div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <div className="text-[11px] font-bold text-slate-500 uppercase">Menunggu Verifikasi</div>
              <div className="text-2xl font-black text-amber-600 mt-1">
                {schools.filter((s) => s.status === 'pending').length}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Pendaftaran Baru</div>
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-blue-600" />
                  Daftar Satuan Pendidikan (Sekolah Terdaftar)
                </h2>
                <p className="text-xs text-slate-500">
                  Data seluruh sekolah penyelenggara ujian berbasis komputer yang terintegrasi di platform SINTESA
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Search */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    placeholder="Cari NPSN, Nama, Kota..."
                    value={schoolSearchTerm}
                    onChange={(e) => setSchoolSearchTerm(e.target.value)}
                    className="pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 w-44 sm:w-56"
                  />
                </div>

                {/* Filter Status */}
                <select
                  value={schoolStatusFilter}
                  onChange={(e) => setSchoolStatusFilter(e.target.value as any)}
                  className="px-2 py-1.5 text-xs border border-slate-300 rounded-lg text-slate-700 bg-white"
                >
                  <option value="all">Semua Status</option>
                  <option value="active">Aktif</option>
                  <option value="pending">Pending</option>
                  <option value="suspended">Suspended</option>
                </select>

                {/* Filter Type */}
                <select
                  value={schoolTypeFilter}
                  onChange={(e) => setSchoolTypeFilter(e.target.value as any)}
                  className="px-2 py-1.5 text-xs border border-slate-300 rounded-lg text-slate-700 bg-white"
                >
                  <option value="all">Semua Bentuk</option>
                  <option value="negeri">Negeri</option>
                  <option value="swasta">Swasta</option>
                </select>

                <button
                  onClick={() => setShowAddSchoolModal(true)}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Sekolah</span>
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 uppercase font-bold border-y border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">No</th>
                    <th className="py-2.5 px-3">NPSN & Nama Satuan Pendidikan</th>
                    <th className="py-2.5 px-3">Bentuk / Jenis</th>
                    <th className="py-2.5 px-3">Kab/Kota & Provinsi</th>
                    <th className="py-2.5 px-3">Kepala Sekolah</th>
                    <th className="py-2.5 px-3">Rekapitulasi</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSchools.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        Tidak ada sekolah terdaftar yang cocok dengan filter pencarian.
                      </td>
                    </tr>
                  ) : (
                    filteredSchools.map((sch, idx) => {
                      const schoolStudents = students.filter((st) => st.school_id === sch.id);
                      const schoolProctors = proctors.filter((p) => p.school_id === sch.id);
                      const schoolAdmin = profiles.find((p) => p.school_id === sch.id && p.role === 'school_admin');

                      return (
                        <tr key={sch.id} className="hover:bg-slate-50/80 transition">
                          <td className="py-3 px-3 text-slate-400 font-mono">{idx + 1}</td>
                          <td className="py-3 px-3">
                            <div className="font-bold text-slate-900">{sch.name}</div>
                            <div className="text-[11px] font-mono text-slate-500 flex items-center gap-1.5 mt-0.5">
                              <span>NPSN:</span>
                              <span className="text-blue-700 font-bold">{sch.npsn}</span>
                              <span className="text-slate-300">•</span>
                              <span className="truncate max-w-[180px]">{sch.email}</span>
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 uppercase">
                              {sch.education_level} • {sch.school_type}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-slate-600">
                            <div className="font-medium text-slate-800">{sch.city_regency}</div>
                            <div className="text-[10px] text-slate-400">{sch.province}</div>
                          </td>
                          <td className="py-3 px-3 text-slate-700 font-medium">
                            <div>{sch.principal_name}</div>
                            {sch.phone && <div className="text-[10px] text-slate-400">{sch.phone}</div>}
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex flex-col gap-0.5 text-[10px] text-slate-600">
                              <span>• Admin: <strong>{schoolAdmin ? schoolAdmin.full_name : '1 Akun'}</strong></span>
                              <span>• Proktor: <strong>{schoolProctors.length} Guru</strong></span>
                              <span>• Siswa: <strong>{schoolStudents.length} Peserta</strong></span>
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            {sch.status === 'active' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                <CheckCircle className="w-3 h-3 text-emerald-600" />
                                Aktif
                              </span>
                            ) : sch.status === 'pending' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                                <AlertCircle className="w-3 h-3 text-amber-600" />
                                Menunggu Verifikasi
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-100 text-red-800">
                                <XCircle className="w-3 h-3 text-red-600" />
                                Suspended
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right space-x-1.5 whitespace-nowrap">
                            <button
                              onClick={() => setSelectedSchoolDetail(sch)}
                              className="px-2.5 py-1 text-slate-700 hover:bg-slate-100 border border-slate-300 rounded text-[11px] font-medium"
                              title="Lihat Detail Profil Sekolah"
                            >
                              Detail
                            </button>
                            <button
                              onClick={() => handleToggleSchoolStatus(sch)}
                              className={`px-2.5 py-1 rounded text-[11px] font-medium border ${
                                sch.status === 'active'
                                  ? 'text-red-700 border-red-200 hover:bg-red-50'
                                  : 'text-emerald-700 border-emerald-200 hover:bg-emerald-50'
                              }`}
                            >
                              {sch.status === 'active' ? 'Nonaktifkan' : 'Aktifkan'}
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
        </div>
      )}

      {/* =========================================================================
          VIEW 2: DATA PENGGUNA (Rekapitulasi Pengguna Setiap Sekolah Termasuk Proktor)
         ========================================================================= */}
      {/* =========================================================================
          VIEW 2: DATA PENGGUNA (Alur: Pilih Sekolah -> Pilih Peran -> Username, Password, Aksi)
         ========================================================================= */}
      {activeSubTab === 'data_pengguna' && (
        <div className="space-y-4">
          {/* Top Summary KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <div className="text-[11px] font-bold text-slate-500 uppercase">Total Akun Pengguna</div>
              <div className="text-2xl font-black text-slate-900 mt-1">{totalUsersCount}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Semua Sekolah & Pusat</div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-blue-200/80 bg-blue-50/20 shadow-xs">
              <div className="text-[11px] font-bold text-blue-700 uppercase">Admin Sekolah</div>
              <div className="text-2xl font-black text-blue-800 mt-1">{adminSchoolsCount}</div>
              <div className="text-[10px] text-blue-600 mt-0.5">Penanggung Jawab Sekolah</div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-amber-200/80 bg-amber-50/20 shadow-xs">
              <div className="text-[11px] font-bold text-amber-700 uppercase">Pengawas / Proktor</div>
              <div className="text-2xl font-black text-amber-800 mt-1">{proctorsCount}</div>
              <div className="text-[10px] text-amber-600 mt-0.5">Guru Pengawas Ujian</div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-emerald-200/80 bg-emerald-50/20 shadow-xs">
              <div className="text-[11px] font-bold text-emerald-700 uppercase">Peserta Ujian</div>
              <div className="text-2xl font-black text-emerald-800 mt-1">{students.length}</div>
              <div className="text-[10px] text-emerald-600 mt-0.5">Siswa Ujian CBT</div>
            </div>
          </div>

          {/* TAHAP 1: PILIH NAMA SEKOLAH (Atau Daftar Akun Super Admin Pusat) */}
          {!selectedUserSchool && !showCenterAdmins && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-blue-600" />
                    Langkah 1: Pilih Satuan Pendidikan (Nama Sekolah)
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Pilih salah satu sekolah untuk melihat pilihan peran (Admin, Pengawas/Proktor, Peserta Ujian) beserta username & password-nya
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCenterAdmins(true)}
                    className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 rounded-lg text-xs font-bold flex items-center gap-1.5 transition"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                    <span>Akun Super Admin Pusat</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setNewUserRole('school_admin');
                      setNewUserSchoolId(schools[0]?.id || '');
                      setShowAddUserModal(true);
                    }}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah Pengguna</span>
                  </button>
                </div>
              </div>

              {/* Search Sekolah */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Cari nama sekolah, NPSN, atau kabupaten/kota..."
                  value={userSchoolSearch}
                  onChange={(e) => setUserSchoolSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Tabel Seluruh Nama Sekolah */}
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3 w-12">No</th>
                      <th className="py-2.5 px-3">Nama Sekolah</th>
                      <th className="py-2.5 px-3">NPSN</th>
                      <th className="py-2.5 px-3 text-center">Admin</th>
                      <th className="py-2.5 px-3 text-center">Pengawas / Proktor</th>
                      <th className="py-2.5 px-3 text-center">Peserta Ujian</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                      <th className="py-2.5 px-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredUserSchools.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-slate-400">
                          Tidak ditemukan sekolah yang cocok dengan pencarian.
                        </td>
                      </tr>
                    ) : (
                      filteredUserSchools.map((sch, idx) => {
                        const adminCount = buildAccountsForSchoolRole(sch.id, 'school_admin').length;
                        const proctorCount = buildAccountsForSchoolRole(sch.id, 'proctor').length;
                        const studentCount = buildAccountsForSchoolRole(sch.id, 'student').length;

                        return (
                          <tr
                            key={sch.id}
                            onClick={() => {
                              setSelectedUserSchoolId(sch.id);
                              setSelectedUserRole('school_admin');
                              setUserAccountSearch('');
                            }}
                            className="hover:bg-blue-50/40 cursor-pointer transition"
                          >
                            <td className="py-3 px-3 text-slate-400 font-mono">{idx + 1}</td>
                            <td className="py-3 px-3">
                              <div className="font-bold text-slate-900">{sch.name}</div>
                              <div className="text-[10px] text-slate-500">
                                {sch.education_level} {sch.school_type === 'negeri' ? 'Negeri' : 'Swasta'} • {sch.city_regency}
                              </div>
                            </td>
                            <td className="py-3 px-3 font-mono font-bold text-blue-700">{sch.npsn}</td>
                            <td className="py-3 px-3 text-center">
                              <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200 font-mono">
                                {adminCount}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-center">
                              <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200 font-mono">
                                {proctorCount}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-center">
                              <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono">
                                {studentCount}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-center">
                              <span
                                className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  sch.status === 'active'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : sch.status === 'pending'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-rose-100 text-rose-800'
                                }`}
                              >
                                {sch.status === 'active' ? 'Aktif' : sch.status === 'pending' ? 'Pending' : 'Nonaktif'}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedUserSchoolId(sch.id);
                                  setSelectedUserRole('school_admin');
                                  setUserAccountSearch('');
                                }}
                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-bold shadow-xs transition"
                              >
                                <span>Pilih Sekolah</span>
                                <ChevronRight className="w-3.5 h-3.5" />
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

          {/* OPSIONAL: AKUN SUPER ADMIN PUSAT */}
          {showCenterAdmins && !selectedUserSchool && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setShowCenterAdmins(false)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1.5 transition"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Kembali ke Daftar Sekolah</span>
                  </button>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">Akun Super Admin Pusat</h2>
                    <p className="text-[11px] text-slate-500">Daftar akun pengelola tingkat pusat SINTESA</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setNewUserRole('super_admin');
                    setShowAddUserModal(true);
                  }}
                  className="px-3 py-1.5 bg-purple-700 hover:bg-purple-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Super Admin</span>
                </button>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3 w-12">No</th>
                      <th className="py-2.5 px-3">Nama Lengkap</th>
                      <th className="py-2.5 px-3">Username</th>
                      <th className="py-2.5 px-3">Password</th>
                      <th className="py-2.5 px-3 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {profiles
                      .filter((p) => p.role === 'super_admin')
                      .map((p, idx) => {
                        const row: SchoolAccountRow = {
                          rowKey: `center-${p.id}`,
                          sourceType: 'profile',
                          profileId: p.id,
                          schoolId: null,
                          role: 'super_admin',
                          fullName: p.full_name,
                          subtitle: 'Super Admin Pusat',
                          username: p.email,
                          password: p.password || 'password123',
                          phone: p.phone,
                        };
                        const isVisible = !!visiblePasswords[row.rowKey];
                        return (
                          <tr key={row.rowKey} className="hover:bg-slate-50/80 transition">
                            <td className="py-3 px-3 text-slate-400 font-mono">{idx + 1}</td>
                            <td className="py-3 px-3">
                              <div className="font-bold text-slate-900">{row.fullName}</div>
                              <div className="text-[10px] text-purple-700 font-semibold">{row.subtitle}</div>
                            </td>
                            <td className="py-3 px-3 font-mono font-semibold text-slate-800">{row.username}</td>
                            <td className="py-3 px-3 font-mono">
                              <div className="flex items-center gap-1.5">
                                <span className="px-2 py-0.5 bg-slate-100 rounded border border-slate-200 text-slate-800">
                                  {isVisible ? row.password : '••••••••'}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleTogglePasswordVisibility(row.rowKey)}
                                  className="p-1 text-slate-500 hover:text-slate-800 rounded hover:bg-slate-100"
                                  title={isVisible ? 'Sembunyikan Password' : 'Lihat Password'}
                                >
                                  {isVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                </button>
                              </div>
                            </td>
                            <td className="py-3 px-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditAccount(row)}
                                  className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded text-[11px] font-semibold"
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleResetPasswordAccount(row)}
                                  className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-semibold"
                                >
                                  Reset
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAHAP 2 & 3: PILIHAN PERAN SEKOLAH -> USERNAME, PASSWORD & AKSI */}
          {selectedUserSchool && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-5">
              {/* Breadcrumb & Header Sekolah Terpilih */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                <div className="space-y-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedUserSchoolId(null);
                      setUserAccountSearch('');
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Kembali ke Daftar Sekolah</span>
                  </button>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-blue-600" />
                      <span>{selectedUserSchool.name}</span>
                    </h2>
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded font-mono text-[11px] font-bold">
                      NPSN: {selectedUserSchool.npsn}
                    </span>
                    <span className="text-xs text-slate-500">• {selectedUserSchool.city_regency}</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleExportSchoolRoleAccounts(selectedUserSchool, selectedUserRole)}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Unduh Akun (.xlsx)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setNewUserSchoolId(selectedUserSchool.id);
                      setNewUserRole(selectedUserRole);
                      setShowAddUserModal(true);
                    }}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah Akun</span>
                  </button>
                </div>
              </div>

              {/* TAHAP 2: PILIHAN PERAN PENGGUNA SEKOLAH TERSEBUT */}
              <div className="space-y-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Langkah 2: Pilih Peran Pengguna di {selectedUserSchool.name}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {(
                    [
                      {
                        key: 'school_admin' as const,
                        label: 'Admin Sekolah',
                        desc: 'Pengelola operasional & data sekolah',
                        count: buildAccountsForSchoolRole(selectedUserSchool.id, 'school_admin').length,
                        activeCls: 'bg-blue-600 text-white border-blue-600 shadow-sm',
                        badgeCls: 'bg-white/20 text-white',
                        idleBadgeCls: 'bg-blue-100 text-blue-800',
                      },
                      {
                        key: 'proctor' as const,
                        label: 'Pengawas / Proktor',
                        desc: 'Guru pengawas & proktor ruang ujian',
                        count: buildAccountsForSchoolRole(selectedUserSchool.id, 'proctor').length,
                        activeCls: 'bg-amber-600 text-white border-amber-600 shadow-sm',
                        badgeCls: 'bg-white/20 text-white',
                        idleBadgeCls: 'bg-amber-100 text-amber-800',
                      },
                      {
                        key: 'student' as const,
                        label: 'Peserta Ujian',
                        desc: 'Siswa peserta asesmen CBT',
                        count: buildAccountsForSchoolRole(selectedUserSchool.id, 'student').length,
                        activeCls: 'bg-emerald-600 text-white border-emerald-600 shadow-sm',
                        badgeCls: 'bg-white/20 text-white',
                        idleBadgeCls: 'bg-emerald-100 text-emerald-800',
                      },
                    ] as const
                  ).map((roleCard) => {
                    const isSelected = selectedUserRole === roleCard.key;
                    return (
                      <button
                        key={roleCard.key}
                        type="button"
                        onClick={() => {
                          setSelectedUserRole(roleCard.key);
                          setUserAccountSearch('');
                        }}
                        className={`p-3.5 rounded-xl border text-left transition flex items-center justify-between gap-2 ${
                          isSelected
                            ? roleCard.activeCls
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200'
                        }`}
                      >
                        <div>
                          <div className="font-bold text-xs sm:text-sm">{roleCard.label}</div>
                          <div
                            className={`text-[10px] mt-0.5 ${
                              isSelected ? 'text-white/85' : 'text-slate-500'
                            }`}
                          >
                            {roleCard.desc}
                          </div>
                        </div>
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-black font-mono shrink-0 ${
                            isSelected ? roleCard.badgeCls : roleCard.idleBadgeCls
                          }`}
                        >
                          {roleCard.count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* TAHAP 3: TABEL USERNAME, PASSWORD & AKSI */}
              {(() => {
                const roleAccounts = buildAccountsForSchoolRole(selectedUserSchool.id, selectedUserRole).filter(
                  (acc) =>
                    acc.fullName.toLowerCase().includes(userAccountSearch.toLowerCase()) ||
                    acc.username.toLowerCase().includes(userAccountSearch.toLowerCase()) ||
                    (acc.subtitle && acc.subtitle.toLowerCase().includes(userAccountSearch.toLowerCase()))
                );

                return (
                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        Langkah 3: Daftar Akun (Username, Password & Aksi)
                      </div>
                      <div className="relative w-full sm:w-72">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                        <input
                          type="text"
                          placeholder="Cari nama atau username..."
                          value={userAccountSearch}
                          onChange={(e) => setUserAccountSearch(e.target.value)}
                          className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div className="overflow-x-auto border border-slate-200 rounded-xl">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-100 text-slate-700 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200">
                          <tr>
                            <th className="py-2.5 px-3 w-12">No</th>
                            <th className="py-2.5 px-3">Nama Pengguna</th>
                            <th className="py-2.5 px-3">Username</th>
                            <th className="py-2.5 px-3">Password</th>
                            <th className="py-2.5 px-3 text-center">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {roleAccounts.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="py-8 text-center text-slate-400">
                                Belum ada akun untuk peran ini di {selectedUserSchool.name}.
                              </td>
                            </tr>
                          ) : (
                            roleAccounts.map((acc, idx) => {
                              const isPwdVisible = !!visiblePasswords[acc.rowKey];
                              return (
                                <tr key={acc.rowKey} className="hover:bg-slate-50/80 transition">
                                  <td className="py-3 px-3 text-slate-400 font-mono">{idx + 1}</td>
                                  <td className="py-3 px-3">
                                    <div className="font-bold text-slate-900">{acc.fullName}</div>
                                    {acc.subtitle && (
                                      <div className="text-[10px] text-slate-500 mt-0.5">{acc.subtitle}</div>
                                    )}
                                  </td>
                                  <td className="py-3 px-3">
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-mono font-semibold text-blue-800">{acc.username}</span>
                                      <button
                                        type="button"
                                        onClick={() => handleCopyText(acc.username, 'Username')}
                                        className="p-1 text-slate-400 hover:text-blue-600 rounded hover:bg-blue-50 transition"
                                        title="Salin Username"
                                      >
                                        <Copy className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </td>
                                  <td className="py-3 px-3">
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-mono px-2 py-0.5 bg-slate-100 border border-slate-200 rounded text-slate-800">
                                        {isPwdVisible ? acc.password : '••••••••'}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => handleTogglePasswordVisibility(acc.rowKey)}
                                        className="p-1 text-slate-500 hover:text-slate-800 rounded hover:bg-slate-100 transition"
                                        title={isPwdVisible ? 'Sembunyikan Password' : 'Lihat Password'}
                                      >
                                        {isPwdVisible ? (
                                          <EyeOff className="w-3.5 h-3.5" />
                                        ) : (
                                          <Eye className="w-3.5 h-3.5" />
                                        )}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleCopyText(acc.password, 'Password')}
                                        className="p-1 text-slate-400 hover:text-blue-600 rounded hover:bg-blue-50 transition"
                                        title="Salin Password"
                                      >
                                        <Copy className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </td>
                                  <td className="py-3 px-3 text-center">
                                    <div className="flex items-center justify-center gap-1">
                                      <button
                                        type="button"
                                        onClick={() => handleOpenEditAccount(acc)}
                                        className="p-1.5 text-blue-600 hover:bg-blue-100/70 rounded-lg transition"
                                        title="Edit Username & Password"
                                      >
                                        <Pencil className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleResetPasswordAccount(acc)}
                                        className="p-1.5 text-amber-600 hover:bg-amber-100/70 rounded-lg transition"
                                        title="Reset Password ke Default (password123)"
                                      >
                                        <KeyRound className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setAccountToDelete(acc)}
                                        className="p-1.5 text-rose-600 hover:bg-rose-100/70 rounded-lg transition"
                                        title="Hapus Akun"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          VIEW 3: DATA PESERTA (Peserta Didik Seluruh Satuan Pendidikan)
         ========================================================================= */}
      {activeSubTab === 'data_peserta' && (
        <div className="space-y-4">
          {/* Top Counters */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <div className="text-[11px] font-bold text-slate-500 uppercase">Total Peserta Terdaftar</div>
              <div className="text-2xl font-black text-slate-900 mt-1">{students.length}</div>
              <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">Seluruh Satuan Pendidikan</div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <div className="text-[11px] font-bold text-slate-500 uppercase">Peserta Laki-Laki</div>
              <div className="text-2xl font-black text-blue-700 mt-1">
                {students.filter((st) => st.gender === 'L').length}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Siswa</div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <div className="text-[11px] font-bold text-slate-500 uppercase">Peserta Perempuan</div>
              <div className="text-2xl font-black text-pink-700 mt-1">
                {students.filter((st) => st.gender === 'P').length}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Siswi</div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <div className="text-[11px] font-bold text-slate-500 uppercase">Status Keaktifan</div>
              <div className="text-2xl font-black text-emerald-600 mt-1">100%</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Terverifikasi NISN</div>
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-600" />
                  Pangkalan Data Peserta Didik Asesmen Digital
                </h2>
                <p className="text-xs text-slate-500">
                  Daftar seluruh peserta didik dari satuan pendidikan yang berhak mengikuti asesmen SINTESA
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    placeholder="Cari NISN, nama peserta..."
                    value={studentSearchTerm}
                    onChange={(e) => setStudentSearchTerm(e.target.value)}
                    className="pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 w-44 sm:w-56"
                  />
                </div>

                <select
                  value={studentSchoolFilter}
                  onChange={(e) => setStudentSchoolFilter(e.target.value)}
                  className="px-2 py-1.5 text-xs border border-slate-300 rounded-lg text-slate-700 bg-white max-w-xs truncate"
                >
                  <option value="all">Semua Sekolah</option>
                  {schools.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>

                <select
                  value={studentGenderFilter}
                  onChange={(e) => setStudentGenderFilter(e.target.value as any)}
                  className="px-2 py-1.5 text-xs border border-slate-300 rounded-lg text-slate-700 bg-white"
                >
                  <option value="all">Semua Gender</option>
                  <option value="L">Laki-laki (L)</option>
                  <option value="P">Perempuan (P)</option>
                </select>
              </div>
            </div>

            {/* Students Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 uppercase font-bold border-y border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">No</th>
                    <th className="py-2.5 px-3">NISN & NIS</th>
                    <th className="py-2.5 px-3">Nama Lengkap Peserta</th>
                    <th className="py-2.5 px-3">Satuan Pendidikan</th>
                    <th className="py-2.5 px-3">Kelas / Rombel</th>
                    <th className="py-2.5 px-3 text-center">Gender</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        Tidak ada data peserta didik yang cocok.
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((st, idx) => (
                      <tr key={st.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-3 text-slate-400 font-mono">{idx + 1}</td>
                        <td className="py-3 px-3 font-mono">
                          <div className="font-bold text-blue-700">{st.nisn}</div>
                          <div className="text-[10px] text-slate-400">NIS: {st.nis || '-'}</div>
                        </td>
                        <td className="py-3 px-3 font-bold text-slate-900">{st.full_name}</td>
                        <td className="py-3 px-3 text-slate-700">
                          <div>{getSchoolName(st.school_id)}</div>
                          <div className="text-[10px] font-mono text-slate-400">NPSN: {getSchoolNpsn(st.school_id)}</div>
                        </td>
                        <td className="py-3 px-3 font-medium text-slate-800">{st.class_name || 'Kelas 6'}</td>
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              st.gender === 'L' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'
                            }`}
                          >
                            {st.gender}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            Aktif
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => setSelectedStudentForCard(st)}
                            className="px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded text-[11px] font-semibold border border-blue-200 transition inline-flex items-center gap-1"
                          >
                            <Printer className="w-3 h-3" />
                            <span>Kartu Peserta</span>
                          </button>
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

      {/* =========================================================================
          VIEW 4: MATA PELAJARAN (Secondary Tab)
         ========================================================================= */}
      {activeSubTab === 'subjects' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="pb-3 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-600" />
              Mata Pelajaran Standar Asesmen Digital SD
            </h2>
            <p className="text-xs text-slate-500">
              Daftar mata uji kompetensi berstandar nasional untuk asesmen jenjang sekolah dasar
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {subjects.map((sub) => (
              <div
                key={sub.id}
                className="p-4 bg-slate-50/70 border border-slate-200 rounded-xl space-y-2 hover:border-blue-300 transition"
              >
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-100 text-blue-700">
                  {sub.code}
                </span>
                <div className="font-bold text-slate-900 text-sm">{sub.name}</div>
                <div className="text-[11px] text-slate-500">Jenjang: Kelas {sub.grade_level || 6} SD/MI</div>
                <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-[11px]">
                  <span className="text-emerald-600 font-semibold flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> Standar Nasional
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =========================================================================
          MODALS
         ========================================================================= */}

      {/* MODAL 1: DETAIL SEKOLAH LENGKAP */}
      {selectedSchoolDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 text-slate-800 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{selectedSchoolDetail.name}</h3>
                  <div className="text-[11px] font-mono text-blue-700">NPSN: {selectedSchoolDetail.npsn}</div>
                </div>
              </div>
              <button
                onClick={() => setSelectedSchoolDetail(null)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Bentuk & Jenjang:</span>
                  <span className="font-bold text-slate-800 uppercase">
                    {selectedSchoolDetail.education_level} ({selectedSchoolDetail.school_type})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Kepala Sekolah:</span>
                  <span className="font-bold text-slate-800">{selectedSchoolDetail.principal_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Alamat:</span>
                  <span className="font-medium text-slate-700 text-right">{selectedSchoolDetail.address}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Kab/Kota & Provinsi:</span>
                  <span className="font-medium text-slate-700">
                    {selectedSchoolDetail.city_regency}, {selectedSchoolDetail.province}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Email Resmi:</span>
                  <span className="font-mono text-blue-700">{selectedSchoolDetail.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Status Operasional:</span>
                  <span
                    className={`font-bold capitalize ${
                      selectedSchoolDetail.status === 'active' ? 'text-emerald-600' : 'text-red-600'
                    }`}
                  >
                    {selectedSchoolDetail.status}
                  </span>
                </div>
              </div>

              {/* Rekap Pengguna Sekolah Ini */}
              <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-200/60 space-y-1">
                <div className="font-bold text-blue-900 text-xs mb-1">Rekapitulasi Akun Pengguna Sekolah:</div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-white p-2 rounded-lg border border-blue-100">
                    <div className="text-[10px] text-slate-500 font-semibold">Admin Sekolah</div>
                    <div className="text-sm font-black text-blue-800 mt-0.5">1 Akun</div>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-blue-100">
                    <div className="text-[10px] text-slate-500 font-semibold">Guru Proktor</div>
                    <div className="text-sm font-black text-amber-800 mt-0.5">
                      {proctors.filter((p) => p.school_id === selectedSchoolDetail.id).length} Guru
                    </div>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-blue-100">
                    <div className="text-[10px] text-slate-500 font-semibold">Siswa Ujian</div>
                    <div className="text-sm font-black text-emerald-800 mt-0.5">
                      {students.filter((st) => st.school_id === selectedSchoolDetail.id).length} Siswa
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-slate-100">
              <button
                onClick={() => {
                  setSelectedUserSchoolId(selectedSchoolDetail.id);
                  setSelectedUserRole('school_admin');
                  setUserAccountSearch('');
                  setActiveSubTab('data_pengguna');
                  setSelectedSchoolDetail(null);
                }}
                className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-semibold border border-blue-200"
              >
                Lihat Semua Akun Pengguna
              </button>
              <button
                onClick={() => setSelectedSchoolDetail(null)}
                className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: TAMBAH SEKOLAH BARU */}
      {showAddSchoolModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <form
            onSubmit={handleCreateSchool}
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 text-slate-800 space-y-4 animate-in fade-in zoom-in-95"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">Tambah Satuan Pendidikan (Sekolah Baru)</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddSchoolModal(false)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs max-h-[70vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">NPSN (8 Digit Unik)</label>
                  <input
                    type="text"
                    required
                    maxLength={8}
                    placeholder="Contoh: 20108899"
                    value={newNpsn}
                    onChange={(e) => setNewNpsn(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Jenjang & Jenis</label>
                  <div className="flex gap-2">
                    <select
                      value={newLevel}
                      onChange={(e) => setNewLevel(e.target.value as any)}
                      className="w-1/2 px-2 py-2 border border-slate-300 rounded-lg bg-white"
                    >
                      <option value="SD">SD</option>
                      <option value="MI">MI</option>
                    </select>
                    <select
                      value={newType}
                      onChange={(e) => setNewType(e.target.value as any)}
                      className="w-1/2 px-2 py-2 border border-slate-300 rounded-lg bg-white"
                    >
                      <option value="negeri">Negeri</option>
                      <option value="swasta">Swasta</option>
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Nama Resmi Sekolah</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: SD Negeri 01 Nusantara"
                  value={newSchoolName}
                  onChange={(e) => setNewSchoolName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Nama Kepala Sekolah</label>
                <input
                  type="text"
                  placeholder="Nama beserta gelar lengkap"
                  value={newPrincipal}
                  onChange={(e) => setNewPrincipal(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Kota / Kabupaten</label>
                  <input
                    type="text"
                    value={newCity}
                    onChange={(e) => setNewCity(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Provinsi</label>
                  <input
                    type="text"
                    value={newProvince}
                    onChange={(e) => setNewProvince(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Alamat Lengkap</label>
                <input
                  type="text"
                  placeholder="Jl. Merdeka No. 10..."
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Email Sekolah / Admin</label>
                  <input
                    type="email"
                    placeholder="admin.sd@jakarta.sch.id"
                    value={newSchoolEmail}
                    onChange={(e) => setNewSchoolEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Nomor Telepon</label>
                  <input
                    type="tel"
                    placeholder="021-3907721"
                    value={newSchoolPhone}
                    onChange={(e) => setNewSchoolPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowAddSchoolModal(false)}
                className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs"
              >
                Simpan Sekolah Baru
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 3: TAMBAH PENGGUNA BARU */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <form
            onSubmit={handleCreateUser}
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 text-slate-800 space-y-4 animate-in fade-in zoom-in-95"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">Tambah Akun Pengguna Sistem</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddUserModal(false)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Peran Akun (Role)</label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-semibold"
                >
                  <option value="school_admin">Admin Sekolah (Pengelola Satuan Pendidikan)</option>
                  <option value="proctor">Guru Proktor / Pengawas Ujian</option>
                  <option value="student">Siswa Peserta Ujian</option>
                  <option value="super_admin">Super Admin Pusat (Kemdikbud)</option>
                </select>
              </div>

              {newUserRole !== 'super_admin' && (
                <div>
                  <label className="block font-semibold mb-1">Satuan Pendidikan (Sekolah)</label>
                  <select
                    value={newUserSchoolId}
                    onChange={(e) => setNewUserSchoolId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  >
                    {schools.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} (NPSN: {s.npsn})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block font-semibold mb-1">Nama Lengkap & Gelar</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Muhammad Ilham, S.Pd."
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Username / Email Login</label>
                  <input
                    type="text"
                    required
                    placeholder="proktor@sekolah.sch.id atau NISN"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">NIP / NISN / ID Pegawai</label>
                  <input
                    type="text"
                    placeholder="19850101..."
                    value={newUserNipNisn}
                    onChange={(e) => setNewUserNipNisn(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Nomor Telepon / WhatsApp</label>
                  <input
                    type="tel"
                    placeholder="08123456789"
                    value={newUserPhone}
                    onChange={(e) => setNewUserPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Password Awal</label>
                  <input
                    type="text"
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowAddUserModal(false)}
                className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs"
              >
                Simpan Akun Pengguna
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 4: CETAK KARTU PESERTA UJIAN */}
      {selectedStudentForCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 text-slate-800 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">Kartu Login Peserta Ujian SINTESA</h3>
              </div>
              <button
                onClick={() => setSelectedStudentForCard(null)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center text-sm"
              >
                ✕
              </button>
            </div>

            {/* Official Exam Card Mockup */}
            <div className="border-2 border-slate-800 rounded-xl p-4 bg-white space-y-3 font-sans shadow-sm">
              <div className="flex items-center gap-3 border-b-2 border-slate-800 pb-2.5">
                <TutWuriLogo size={42} />
                <div className="text-left">
                  <div className="text-[10px] font-bold text-slate-700 uppercase tracking-tight">
                    KEMENTERIAN PENDIDIKAN DASAR DAN MENENGAH
                  </div>
                  <div className="text-xs font-black text-slate-900 leading-tight">
                    KARTU LOGIN ASESMEN & UJIAN BERBASIS KOMPUTER
                  </div>
                  <div className="text-[10px] font-semibold text-blue-700 font-mono">
                    TAHUN AJARAN 2024/2025
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="col-span-2 space-y-1 text-[11px]">
                  <div>
                    <span className="text-slate-500">Nama: </span>
                    <strong className="text-slate-900">{selectedStudentForCard.full_name}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">NISN: </span>
                    <strong className="font-mono text-blue-800">{selectedStudentForCard.nisn}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Sekolah: </span>
                    <span className="font-medium text-slate-800">
                      {getSchoolName(selectedStudentForCard.school_id)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Kelas / Rombel: </span>
                    <span className="font-medium text-slate-800">
                      {selectedStudentForCard.class_name || 'Kelas 6'}
                    </span>
                  </div>
                  <div className="pt-1 text-[10px] text-slate-500">
                    <div>Username: <strong className="font-mono text-slate-800">{selectedStudentForCard.nisn}</strong></div>
                    <div>Password Default: <strong className="font-mono text-slate-800">password123</strong></div>
                  </div>
                </div>

                <div className="col-span-1 flex flex-col items-center justify-center p-2 bg-slate-50 border border-slate-200 rounded-lg">
                  <QrCode className="w-14 h-14 text-slate-800" />
                  <span className="text-[9px] font-mono text-slate-500 mt-1">VERIF-VALID</span>
                </div>
              </div>

              <div className="border-t border-dashed border-slate-300 pt-2 text-[9px] text-slate-400 italic text-center">
                Bawalah kartu ini saat memasuki ruang lab asesmen dan jaga kerahasiaan kata sandi Anda.
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setSelectedStudentForCard(null)}
                className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold"
              >
                Tutup
              </button>
              <button
                onClick={() => {
                  window.print();
                }}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak Kartu Peserta</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: EDIT AKUN PENGGUNA (USERNAME & PASSWORD) */}
      {editingAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <form
            onSubmit={handleSaveEditAccount}
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 text-slate-800 space-y-4 animate-in fade-in zoom-in-95"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Pencil className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">Edit Akun Pengguna</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingAccount(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  value={editAccName}
                  onChange={(e) => setEditAccName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Username / ID Login</label>
                <input
                  type="text"
                  required
                  value={editAccUsername}
                  onChange={(e) => setEditAccUsername(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Password</label>
                <input
                  type="text"
                  required
                  value={editAccPassword}
                  onChange={(e) => setEditAccPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingAccount(null)}
                className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs"
              >
                Simpan Perubahan
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 6: KONFIRMASI HAPUS AKUN */}
      {accountToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 text-slate-800 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center border border-rose-100">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Hapus Akun Pengguna?</h3>
                <p className="text-xs text-slate-500">Tindakan ini tidak dapat dibatalkan.</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-200">
              Anda akan menghapus akun <strong>{accountToDelete.fullName}</strong> (Username:{' '}
              <span className="font-mono">{accountToDelete.username}</span>).
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAccountToDelete(null)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteAccount}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-xs"
              >
                Hapus Akun
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Internal mini icon for proctor headphones
const HeadphonesIcon: React.FC<{ className?: string }> = ({ className = 'w-3 h-3' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
    <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
  </svg>
);
