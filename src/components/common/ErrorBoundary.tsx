import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="fixed inset-0 bg-black text-white p-8 overflow-auto z-[9999]">
                    <h1 className="text-2xl font-bold text-red-500 mb-4">Application Error</h1>
                    <pre className="whitespace-pre-wrap font-mono text-sm bg-gray-900 p-4 rounded">
                        {this.state.error?.toString()}
                    </pre>
                    <button
                        onClick={() => window.location.reload()}
                        className="mt-6 px-4 py-2 bg-white text-black rounded font-bold"
                    >
                        Reload
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}
