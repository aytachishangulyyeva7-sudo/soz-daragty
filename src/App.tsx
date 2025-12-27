import { useState, useEffect } from 'react';
import { GameSetup } from './components/GameSetup';
import { AdminDashboard } from './components/AdminDashboard';
import { ContestantDisplay } from './components/ContestantDisplay';

function App() {
  const [view, setView] = useState<'setup' | 'admin' | 'display'>('setup');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [adminLink, setAdminLink] = useState('');
  const [displayLink, setDisplayLink] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const v = params.get('view');
    const s = params.get('session');
    if (v && s) {
      setView(v as any);
      setSessionId(s);
    }
  }, []);

  const handleCreated = (id: string) => {
    const origin = window.location.origin;
    setAdminLink(`${origin}?view=admin&session=${id}`);
    setDisplayLink(`${origin}?view=display&session=${id}`);
    setSessionId(id);
    setShowModal(true);
  };

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Kopyalandı!');
  };

  if (view === 'admin' && sessionId) return <AdminDashboard sessionId={sessionId} />;
  if (view === 'display' && sessionId) return <ContestantDisplay sessionId={sessionId} />;

  return (
    <>
      <GameSetup onGameCreated={handleCreated} />

      {showModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl p-8 max-w-2xl w-full border-2 border-slate-700">
            <h2 className="text-3xl font-bold text-white text-center mb-6">Oyun döredildi!</h2>
            <div className="space-y-6">
              <div>
                <label className="block text-slate-300 mb-2">Admin panel salgysy</label>
                <div className="flex gap-3">
                  <input readOnly value={adminLink} className="flex-1 bg-slate-700 text-white px-4 py-3 rounded-lg font-mono text-sm" />
                  <button onClick={() => copy(adminLink)} className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg text-white font-semibold">Kopyala</button>
                </div>
              </div>
              <div>
                <label className="block text-slate-300 mb-2">Gatnaşyjy ekran salgysy</label>
                <div className="flex gap-3">
                  <input readOnly value={displayLink} className="flex-1 bg-slate-700 text-white px-4 py-3 rounded-lg font-mono text-sm" />
                  <button onClick={() => copy(displayLink)} className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg text-white font-semibold">Kopyala</button>
                </div>
              </div>
            </div>
            <button
              onClick={() => {
                setView('admin');
                setShowModal(false);
              }}
              className="mt-8 w-full bg-gradient-to-r from-amber-500 to-amber-600 text-white text-xl font-bold py-4 rounded-xl"
            >
              Admin Paneline Git
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default App;