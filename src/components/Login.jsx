/**
 * @file Login.jsx
 * @description Componente de interface de autenticação. Atua como barreira visual (Gatekeeper).
 */

import React from "react";

const Login = ({onLogin}) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-xl border border-neutral-100 text-center space-y-8 animate-in zoom-in-95 duration-500">
        <div>
          <h1 className="text-4xl font-black text-neutral-900 tracking-tighter mb-2">
            BARISTA PRO
          </h1>
          <p className="text-sm text-neutral-500 font-medium">
            Calibração e telemetria de precisão
          </p>
        </div>

        <div className="bg-neutral-50 p-6 rounded-2xl border border-neutral-100">
          <p className="text-sm text-neutral-600 mb-6">
            Acesse seu laboratório para sincronizar seus setups e receitas na
            nuvem.
          </p>
          <button
            onClick={onLogin}
            className="w-full bg-neutral-900 hover:bg-neutral-800 text-white font-bold py-4 px-6 rounded-xl transition-all active:scale-95 flex items-center justify-center gap-3 shadow-lg"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Entrar com Google
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
