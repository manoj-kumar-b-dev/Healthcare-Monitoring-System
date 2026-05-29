import React from 'react'
import Login from './Login'
import Register from './Register'

function Auth() {
  const [register, setRegister] = React.useState(false)
  return (
    <main className='min-h-screen flex justify-center items-center bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 px-4 py-8 relative overflow-hidden'>
      {/* Background decorations */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-32 w-96 h-96 rounded-full bg-blue-600/10 blur-3xl" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 rounded-full bg-cyan-600/10 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-blue-800/5 blur-3xl" />
      </div>

      <div className="relative z-10 flex flex-col items-center w-full">
        {/* Top branding */}
        <div className="mb-6 text-center">
          <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest">
            Smart Healthcare Monitoring System
          </p>
        </div>

        {!register
          ? <Login setRegister={() => setRegister(true)} />
          : <Register setLogin={() => setRegister(false)} />
        }

        {/* Footer */}
        <p className="mt-6 text-slate-600 text-xs text-center">
          Protected by end-to-end encryption • HIPAA-compliant
        </p>
      </div>
    </main>
  )
}

export default Auth