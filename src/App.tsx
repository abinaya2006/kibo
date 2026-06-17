import React from 'react';
import { usePetController } from './hooks/usePetController';
import { PetRenderer } from './components/Pet/PetRenderer';
import { ChatWindow } from './components/Chat/ChatWindow';

// ── Separate component trees so hooks are never called conditionally ──────────

const PetApp: React.FC = () => {
  // usePetController must live at the TOP of a component, unconditionally
  usePetController();

  return (
    <div className="desktop-pet-app">
      <PetRenderer />
    </div>
  );
};

const ChatApp: React.FC = () => (
  <div
    className="desktop-pet-chat-window"
    style={{
      width: '100vw',
      height: '100vh',
      padding: '8px',
      background: 'transparent',
      boxSizing: 'border-box',
    }}
  >
    <ChatWindow />
  </div>
);

// ── Root router: reads ?window=chat to decide which tree to mount ─────────────

const App: React.FC = () => {
  const params = new URLSearchParams(window.location.search);
  const targetWindow = params.get('window');

  if (targetWindow === 'chat') {
    return <ChatApp />;
  }

  return <PetApp />;
};

export default App;
