export interface Announcement {
  id: string;
  title: string;
  author: string;
  date: string;
  time: string;
  category: 'POSKO' | 'TEKNIS' | 'INFO';
  isImportant?: boolean;
  content: string;
}

export interface HelpdeskTicket {
  id: string;
  school_id: string;
  school_name: string;
  proctor_name: string;
  subject: string;
  category: 'TOKEN' | 'LOGIN_SISWA' | 'JARINGAN' | 'RESET_LOGIN' | 'SERVER_OFFLINE' | 'LAINNYA';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'resolved';
  description: string;
  response?: string;
  created_at: string;
  updated_at: string;
}

export interface ProctorComputer {
  id: string;
  school_id: string;
  school_name: string;
  proctor_id_code: string; // e.g. P20101001-R01
  room_name: string;
  ip_address: string;
  password_hash: string;
  client_count: number;
  status: 'online' | 'standby' | 'offline';
  last_sync: string;
}

export interface TestGroupAllocation {
  id: string;
  group_number: number;
  test_code: string; // e.g. SIMTKAP26H2
  session_time: string; // e.g. 07.00 - 15.30 WIB
  is_active: boolean;
  token_released: boolean;
  token_code: string;
  assigned_students_count: number;
}

export interface DownloadableFile {
  id: string;
  name: string;
  category: 'folder' | 'pdf' | 'installer';
  size: string;
  description: string;
  date: string;
  version?: string;
}

export interface BlankSpotRequest {
  id: string;
  school_id: string;
  school_name: string;
  npsn: string;
  province: string;
  city_regency: string;
  reason: string;
  internet_speed_mbps: number;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string;
  submitted_at: string;
  reviewed_at?: string;
}

export interface SchoolPermissionRequest {
  id: string;
  school_id: string;
  school_name: string;
  npsn: string;
  proctor_or_admin: string;
  request_type: 'UJIAN_SUSULAN' | 'SESI_TAMBAHAN' | 'RESET_LOGIN_MASSAL' | 'MODA_ASESMEN' | 'DISPENSASI_LAB' | 'TOKEN_DARURAT';
  title: string;
  reason: string;
  student_count?: number;
  status: 'pending' | 'approved' | 'rejected';
  rejection_note?: string;
  submitted_at: string;
  reviewed_at?: string;
}

export interface ExamTypeItem {
  id: string;
  code: string;
  name: string;
  description?: string;
  default_duration_minutes: number;
  default_passing_grade: number;
  is_active: boolean;
  created_at: string;
}

export interface ExamConfiguration {
  id: string;
  exam_type_id: string;
  exam_type_name?: string;
  title: string;
  duration_minutes: number;
  passing_grade: number;
  randomize_questions: boolean;
  randomize_options: boolean;
  require_token: boolean;
  show_result_to_student: boolean;
  strict_fullscreen: boolean;
  max_violations: number;
  is_active: boolean;
  updated_at: string;
}

export interface ExamPeriod {
  id: string;
  name: string;
  academic_year: string;
  semester: 'Ganjil' | 'Genap';
  exam_type_id: string;
  exam_type_name?: string;
  start_date: string;
  end_date: string;
  status: 'upcoming' | 'active' | 'closed';
  notes?: string;
  created_at: string;
}
