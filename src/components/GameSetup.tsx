import { useState } from 'react';
import { Trophy, Users, Plus, Trash2 } from 'lucide-react';
import { generateId, insert, update } from '../lib/localDb';

interface GameSetupProps {
  onGameCreated: (sessionId: string) => void;
}

export const GameSetup = ({ onGameCreated }: GameSetupProps) => {
  const [groups, setGroups] = useState<string[]>(['Alfa Topar', 'Beta Topar', 'Gamma Topar']);
  const [newGroupName, setNewGroupName] = useState('');
  const [creating, setCreating] = useState(false);

  const addGroup = () => {
    const name = newGroupName.trim();
    if (name && !groups.includes(name)) {
      setGroups([...groups, name]);
      setNewGroupName('');
    }
  };

  const removeGroup = (i: number) => {
    if (groups.length > 1) setGroups(groups.filter((_, index) => index !== i));
  };

  const createGame = async () => {
    if (creating || groups.length === 0) return;
    setCreating(true);

    try {
      const sessionId = generateId();
      await insert('game_sessions', {
        id: sessionId,
        current_round: 1
      });

      const groupIds: string[] = [];
      for (let i = 0; i < groups.length; i++) {
        const groupId = generateId();
        
        await insert('groups', {
          id: groupId,
          session_id: sessionId,
          name: groups[i],
          score: 0,
          turn_order: i + 1
        });

        await insert('game_state', {
          id: generateId(),
          session_id: sessionId,
          group_id: groupId,
          guesses: '[]',
          attempts_used: 0,
          timer_active: 0
        });

        groupIds.push(groupId);
      }

      await update(
        'game_sessions',
        { current_group_id: groupIds[0] },
        'id = ?',
        [sessionId]
      );

      console.log('✅ Oýun döredildi:', sessionId);
      onGameCreated(sessionId);
    } catch (e) {
      console.error('❌ Oýun döretmekde säwlik:', e);
      alert('Säwlik ýüze çykdy! Gaýtadan synanyşyň.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-8">
      <div className="max-w-2xl w-full">
        <div className="bg-slate-800/50 backdrop-blur-xl rounded-3xl border-2 border-slate-700 p-8 shadow-2xl">
          <div className="text-center mb-8">
            <Trophy className="w-20 h-20 text-amber-400 mx-auto mb-4" />
            <h1 className="text-5xl font-black text-white mb-2">Söz Daragty</h1>
            <p className="text-slate-300 text-lg"></p>
          </div>
          <div className="space-y-6">
            <div>
              <label className="flex items-center gap-2 text-lg font-semibold text-white mb-3">
                <Users className="w-5 h-5" /> Toparlar
              </label>
              <div className="space-y-3 mb-4">
                {groups.map((g, i) => (
                  <div key={i} className="flex items-center justify-between bg-slate-700/60 rounded-lg px-5 py-3 border border-slate-600 hover:bg-slate-700 transition-colors">
                    <span className="text-white font-medium">{g}</span>
                    <button 
                      onClick={() => removeGroup(i)} 
                      disabled={groups.length === 1} 
                      className="text-red-400 hover:text-red-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={newGroupName}
                  onChange={e => setNewGroupName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addGroup()}
                  placeholder="Täze topar..."
                  className="flex-1 bg-slate-700 text-white rounded-lg px-4 py-3 border border-slate-600 focus:border-blue-500 focus:outline-none transition-colors"
                />
                <button 
                  onClick={addGroup} 
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 font-semibold transition-colors shadow-lg hover:shadow-blue-600/50"
                >
                  <Plus className="w-5 h-5" /> Goş
                </button>
              </div>
            </div>
            <button
              onClick={createGame}
              disabled={creating}
              className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-2xl font-bold py-5 rounded-2xl shadow-2xl hover:shadow-amber-600/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creating ? '🔄 Döredilýär...' : '🎮 Oýny Başlat'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};