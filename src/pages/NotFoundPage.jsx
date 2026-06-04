import { Link, useLocation } from 'react-router-dom'

export function NotFoundPage() {
  const location = useLocation()
  return (
    <div className="min-h-svh bg-slate-50 px-4 py-12 flex items-center justify-center">
      <div className="max-w-md w-full card p-8 text-center">
        <p className="text-7xl font-black text-slate-200 leading-none">404</p>
        <h1 className="mt-3 text-2xl font-extrabold text-slate-900">Página não encontrada</h1>
        <p className="mt-2 text-sm text-slate-500">
          O endereço{' '}
          <span className="font-mono text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded text-xs">
            {location.pathname}
          </span>{' '}
          não existe.
        </p>
        <div className="mt-6 flex flex-col gap-3">
          <Link to="/" className="btn-primary">Ir para o site</Link>
          <Link to="/login" className="btn-secondary">Acesso interno</Link>
        </div>
      </div>
    </div>
  )
}
