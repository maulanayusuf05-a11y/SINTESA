import React, { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { Navbar } from './components/common/Navbar';
import { Sidebar } from './components/common/Sidebar';
import { LoginPage } from './components/auth/LoginPage';
import { RegisterSchoolPage } from './components/auth/RegisterSchoolPage';
import { ForgotPasswordModal } from './components/auth/ForgotPasswordModal';
import { SuperAdminPortal } from './components/superadmin/SuperAdminPortal';
import { SchoolAdminPortal } from './components/schooladmin/SchoolAdminPortal';
import { ProctorDashboard } from './components/dashboards/ProctorDashboard';
import { StudentDashboard } from './components/dashboards/StudentDashboard';

const MainAppContent: React.FC = () => {
  const { user, role, isLoading } = useAuth();

  // Navigation & View States
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [authView, setAuthView] = useState<'login' | 'register'>('login');
  const [showForgotModal, setShowForgotModal] = useState<boolean>(false);

  // Loading screen
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-3"></div>
        <div className="text-sm font-semibold tracking-wide">Memuat SINTESA...</div>
        <div className="text-xs text-slate-400 mt-1">Sistem Informasi Tes dan Asesmen</div>
      </div>
    );
  }

  // Not logged in: Show Login or Register School
  if (!user) {
    return (
      <div className="min-h-screen bg-[#fcfdfe] flex flex-col font-sans">
        {authView === 'login' ? (
          <LoginPage
            onGoToRegister={() => setAuthView('register')}
            onOpenForgotPassword={() => setShowForgotModal(true)}
          />
        ) : (
          <RegisterSchoolPage onBackToLogin={() => setAuthView('login')} />
        )}

        <ForgotPasswordModal
          isOpen={showForgotModal}
          onClose={() => setShowForgotModal(false)}
        />
      </div>
    );
  }

  // Khusus Super Admin
  if (role === 'super_admin') {
    return (
      <>
        <SuperAdminPortal />
        <ForgotPasswordModal
          isOpen={showForgotModal}
          onClose={() => setShowForgotModal(false)}
        />
      </>
    );
  }

  // Khusus Admin Sekolah
  if (role === 'school_admin') {
    return (
      <>
        <SchoolAdminPortal />
        <ForgotPasswordModal
          isOpen={showForgotModal}
          onClose={() => setShowForgotModal(false)}
        />
      </>
    );
  }

  // Logged In: Proctor & Student Layout
  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-900">
      <Navbar />

      <div className="flex-1 flex flex-col md:flex-row max-w-7xl w-full mx-auto">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {role === 'proctor' && <ProctorDashboard activeTab={activeTab} />}
          {role === 'student' && <StudentDashboard activeTab={activeTab} />}
        </main>
      </div>

      <ForgotPasswordModal
        isOpen={showForgotModal}
        onClose={() => setShowForgotModal(false)}
      />
    </div>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <MainAppContent />
      </AuthProvider>
    </ErrorBoundary>
  );
}
