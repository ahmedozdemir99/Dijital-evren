import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface Props {
  moduleName?: string;
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export class ModuleErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      message: error.message || 'Beklenmeyen bir modül hatası oluştu.',
    };
  }

  handleReset = () => {
    this.setState({ hasError: false, message: '' });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="max-w-xl mx-auto my-12 p-6 rounded-xl bg-white dark:bg-[#1C2633] border border-red-300 dark:border-red-500/30">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-[#141923] dark:text-[#F1F3F5]">
                {this.props.moduleName ? `${this.props.moduleName} modülünde hata` : 'Modül hatası'}
              </h2>
              <p className="text-sm text-[#546070] dark:text-[#9BA7B6]">
                Diğer modüller ve verileriniz etkilenmedi. Bu modülü yeniden başlatabilirsiniz.
              </p>
              <p className="text-xs font-mono text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 px-3 py-2 rounded-lg">
                {this.state.message}
              </p>
              <button
                type="button"
                onClick={this.handleReset}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg bg-[#8C6B32] dark:bg-[#D6B782] text-white dark:text-[#10151E] hover:opacity-90 transition-opacity"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Modülü Yeniden Yükle
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
