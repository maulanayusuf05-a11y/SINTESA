import { Announcement, HelpdeskTicket, ProctorComputer, TestGroupAllocation, DownloadableFile, BlankSpotRequest, SchoolPermissionRequest } from '../types/tka';

const INITIAL_PERMISSION_REQUESTS: SchoolPermissionRequest[] = [];

const INITIAL_BLANK_SPOT_REQUESTS: BlankSpotRequest[] = [];

const INITIAL_ANNOUNCEMENTS: Announcement[] = [];

const INITIAL_TICKETS: HelpdeskTicket[] = [];

const INITIAL_PROCTOR_COMPUTERS: ProctorComputer[] = [];

export const DOWNLOAD_FILES: DownloadableFile[] = [];

class TkaStore {
  private get<T>(key: string, def: T): T {
    try {
      const data = localStorage.getItem(`tka_${key}`);
      return data ? JSON.parse(data) : def;
    } catch {
      return def;
    }
  }

  private set<T>(key: string, val: T): void {
    try {
      localStorage.setItem(`tka_${key}`, JSON.stringify(val));
    } catch (e) {
      console.error(e);
    }
  }

  // Announcements
  getAnnouncements(): Announcement[] {
    return this.get<Announcement[]>('announcements', INITIAL_ANNOUNCEMENTS);
  }

  addAnnouncement(ann: Omit<Announcement, 'id'>): Announcement {
    const list = this.getAnnouncements();
    const newAnn: Announcement = {
      ...ann,
      id: 'ann-' + Math.random().toString(36).substring(2, 9),
    };
    list.unshift(newAnn);
    this.set('announcements', list);
    return newAnn;
  }

  updateAnnouncement(id: string, updates: Partial<Announcement>): void {
    const list = this.getAnnouncements();
    const idx = list.findIndex((a) => a.id === id);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...updates };
      this.set('announcements', list);
    }
  }

  deleteAnnouncement(id: string): void {
    const list = this.getAnnouncements();
    const filtered = list.filter((a) => a.id !== id);
    this.set('announcements', filtered);
  }

  // Tickets
  getTickets(schoolId?: string | null): HelpdeskTicket[] {
    const all = this.get<HelpdeskTicket[]>('tickets', INITIAL_TICKETS);
    if (!schoolId) return all;
    return all.filter((t) => t.school_id === schoolId);
  }

  addTicket(ticket: Omit<HelpdeskTicket, 'id' | 'created_at' | 'updated_at'>): HelpdeskTicket {
    const all = this.getTickets();
    const newTicket: HelpdeskTicket = {
      ...ticket,
      id: `TKT-2026-${String(all.length + 1).padStart(3, '0')}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    all.unshift(newTicket);
    this.set('tickets', all);
    return newTicket;
  }

  updateTicket(id: string, updates: Partial<HelpdeskTicket>): void {
    const all = this.getTickets();
    const idx = all.findIndex((t) => t.id === id);
    if (idx >= 0) {
      all[idx] = { ...all[idx], ...updates, updated_at: new Date().toISOString() };
      this.set('tickets', all);
    }
  }

  // Proctor Computers
  getProctorComputers(schoolId?: string | null): ProctorComputer[] {
    const all = this.get<ProctorComputer[]>('proctor_computers', INITIAL_PROCTOR_COMPUTERS);
    if (!schoolId) return all;
    return all.filter((p) => p.school_id === schoolId);
  }

  addProctorComputer(pc: Omit<ProctorComputer, 'id'>): ProctorComputer {
    const all = this.getProctorComputers();
    const newPc: ProctorComputer = {
      ...pc,
      id: 'pc-' + Math.random().toString(36).substring(2, 9),
    };
    all.push(newPc);
    this.set('proctor_computers', all);
    return newPc;
  }

  // Active Token & Session
  getActiveToken(): { code: string; testCode: string; validUntil: string; releasedAt: string } {
    return this.get('active_token', {
      code: '',
      testCode: '',
      validUntil: '-',
      releasedAt: '-',
    });
  }

  releaseNewToken(testCode = 'TKA-AKTIF'): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const tokenData = {
      code,
      testCode,
      validUntil: '15:30 WIB',
      releasedAt: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB',
    };
    this.set('active_token', tokenData);
    return code;
  }

  // Blank Spot Requests
  getBlankSpotRequests(schoolId?: string | null): BlankSpotRequest[] {
    const all = this.get<BlankSpotRequest[]>('blank_spot_requests', INITIAL_BLANK_SPOT_REQUESTS);
    if (!schoolId) return all;
    return all.filter((r) => r.school_id === schoolId);
  }

  addBlankSpotRequest(req: Omit<BlankSpotRequest, 'id' | 'submitted_at' | 'status'>): BlankSpotRequest {
    const all = this.getBlankSpotRequests();
    const newReq: BlankSpotRequest = {
      ...req,
      id: 'req-bs-' + Math.random().toString(36).substring(2, 9),
      status: 'pending',
      submitted_at: new Date().toISOString(),
    };
    all.unshift(newReq);
    this.set('blank_spot_requests', all);
    return newReq;
  }

  updateBlankSpotRequest(id: string, status: 'approved' | 'rejected', rejection_reason?: string): void {
    const all = this.getBlankSpotRequests();
    const idx = all.findIndex((r) => r.id === id);
    if (idx >= 0) {
      all[idx] = {
        ...all[idx],
        status,
        rejection_reason: status === 'rejected' ? rejection_reason : undefined,
        reviewed_at: new Date().toISOString(),
      };
      this.set('blank_spot_requests', all);
    }
  }

  // School Permission Requests (Sekolah yang Meminta Izin)
  getPermissionRequests(schoolId?: string | null): SchoolPermissionRequest[] {
    const all = this.get<SchoolPermissionRequest[]>('permission_requests', INITIAL_PERMISSION_REQUESTS);
    if (!schoolId) return all;
    return all.filter((r) => r.school_id === schoolId);
  }

  addPermissionRequest(req: Omit<SchoolPermissionRequest, 'id' | 'submitted_at' | 'status'>): SchoolPermissionRequest {
    const all = this.getPermissionRequests();
    const newReq: SchoolPermissionRequest = {
      ...req,
      id: `IZIN-2026-${String(all.length + 1).padStart(3, '0')}`,
      status: 'pending',
      submitted_at: new Date().toISOString(),
    };
    all.unshift(newReq);
    this.set('permission_requests', all);
    return newReq;
  }

  updatePermissionRequest(id: string, status: 'approved' | 'rejected', rejection_note?: string): void {
    const all = this.getPermissionRequests();
    const idx = all.findIndex((r) => r.id === id);
    if (idx >= 0) {
      all[idx] = {
        ...all[idx],
        status,
        rejection_note: status === 'rejected' ? rejection_note : undefined,
        reviewed_at: new Date().toISOString(),
      };
      this.set('permission_requests', all);
    }
  }
}

export const tkaStore = new TkaStore();
