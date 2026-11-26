import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error?.message || 'Terjadi kesalahan yang tidak terduga pada aplikasi.',
    };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('SINTESA ErrorBoundary caught:', error, info);
  }

  handleReload = () => {
    this.setState({ hasError: false, errorMessage: '' });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6 font-sans">
          <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-xl p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h1 className="text-base font-bold text-slate-900">
                Terjadi Gangguan Tampilan Sistem
              </h1>
              <p className="text-xs text-slate-500 leading-relaxed">
                Aplikasi SINTESA mengalami kesalahan tak terduga. Silakan muat ulang halaman untuk melanjutkan sesi Anda.
              </p>
            </div>
            {this.state.errorMessage && (
              <div className="text-[11px] font-mono text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-2.5 break-words">
                {this.state.errorMessage}
              </div>
            )}
            <button
              type="button"
              onClick={this.handleReload}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition inline-flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Muat Ulang Halaman</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
