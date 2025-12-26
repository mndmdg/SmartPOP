
import React, { useState, useEffect } from 'react';
import { AppState, UserRole, User } from './types';
import { loadState, saveState } from './dataStore';
import LoginView from './views/LoginView';
import AdminDashboard from './views/AdminDashboard';
import WorkerDashboard from './views/WorkerDashboard';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(loadState());
  const [view, setView] = useState<'login' | 'admin' | 'worker'>('login');

  useEffect(() => {
    saveState(state);
  }, [state]);

  const handleLogin = (user: User) => {
    setState(prev => ({ ...prev, currentUser: user }));
    setView(user.role === UserRole.ADMIN ? 'admin' : 'worker');
  };

  const handleLogout = () => {
    setState(prev => ({ ...prev, currentUser: null }));
    setView('login');
  };

  const updateState = (updater: (prev: AppState) => AppState) => {
    setState(prev => updater(prev));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {view === 'login' && (
        <LoginView users={state.users} onLogin={handleLogin} />
      )}
      
      {view === 'admin' && state.currentUser && (
        <AdminDashboard 
          state={state} 
          updateState={updateState} 
          onLogout={handleLogout} 
        />
      )}

      {view === 'worker' && state.currentUser && (
        <WorkerDashboard 
          state={state} 
          updateState={updateState} 
          onLogout={handleLogout} 
        />
      )}

      <footer className="py-8 text-center text-gray-400 text-sm">
        &copy; 2024 SmartPOP System. All rights reserved.
      </footer>
    </div>
  );
};

export default App;
