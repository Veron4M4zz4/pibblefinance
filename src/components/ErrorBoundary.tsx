import React from "react";

type Props = {
  children: React.ReactNode;
};

type State = {
  hasError: boolean;
  errorMessage: string;
};

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      errorMessage: "",
    };
  }

  static getDerivedStateFromError(error: Error) {
    return {
      hasError: true,
      errorMessage: error.message || "Erro inesperado",
    };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("App render error:", error, info);
  }

  handleReload = () => {
    this.setState({
      hasError: false,
      errorMessage: "",
    });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-white">
          <div className="card-premium relative w-full max-w-lg overflow-hidden rounded-[28px] p-8">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(99,102,241,0.16),_transparent_30%),radial-gradient(circle_at_bottom_left,_rgba(244,63,94,0.08),_transparent_28%)]" />

            <div className="relative">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.28em] text-indigo-300">
                PibbleFinance
              </p>

              <h1 className="text-3xl font-black tracking-tight text-white">
                O site encontrou um erro
              </h1>

              <p className="mt-3 text-sm leading-6 text-slate-300">
                A aplicação foi protegida para não ficar em branco. Isso costuma
                acontecer quando um dado inesperado entra em um componente.
              </p>

              <div className="mt-5 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-xs text-rose-100">
                {this.state.errorMessage || "Erro sem mensagem detalhada."}
              </div>

              <button
                type="button"
                onClick={this.handleReload}
                className="mt-6 rounded-2xl bg-white px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-slate-100"
              >
                Recarregar site
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
