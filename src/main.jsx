import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    console.error('Ryuu render error:', error);
  }

  resetStore = () => {
    localStorage.removeItem('ryuu-cart-v3');
    localStorage.removeItem('ryuu-pix-payment-v1');
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <main className="flex min-h-screen items-center justify-center bg-[#050505] px-6 text-white">
          <section className="max-w-md rounded-2xl border border-pink-500/40 bg-black/50 p-8 text-center shadow-pink-glow">
            <p className="text-sm font-bold uppercase tracking-[0.3em] text-pink-200">Ryuu Cheats</p>
            <h1 className="mt-3 text-3xl font-black">A loja travou ao carregar</h1>
            <p className="mt-3 text-sm text-white/70">
              Parece que houve um erro ao carregar a loja. Tente recarregar a página ou clique no botão abaixo para redefinir o armazenamento local e reiniciar a loja.
            </p>
            <button
              type="button"
              onClick={this.resetStore}
              className="mt-6 w-full rounded-xl bg-gradient-to-r from-pink-600 to-ryuu-neon px-5 py-3 font-black text-white"
            >
              Recarregar loja
            </button>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);
