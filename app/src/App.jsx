import { useCallback, useEffect, useState } from 'react';
import { AppBar, Avatar, Button, Container, Toolbar } from '@mui/material';
import UserPicker from './components/UserPicker.jsx';
import SchoolSearch from './components/SchoolSearch.jsx';
import VisitForm from './components/VisitForm.jsx';
import MyVisits from './components/MyVisits.jsx';
import { syncQueuedVisits } from './lib/offline-store.js';

export default function App() {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('visit-log-user') ?? 'null'); } catch { return null; }
  });
  const [screen, setScreen] = useState('schools');
  const [school, setSchool] = useState(null);
  const [online, setOnline] = useState(navigator.onLine);
  const [refreshKey, setRefreshKey] = useState(0);

  const syncAndRefresh = useCallback(() => {
    setOnline(navigator.onLine);
    if (navigator.onLine) {
      syncQueuedVisits().finally(() => setRefreshKey((value) => value + 1));
    }
  }, []);

  useEffect(() => {
    window.addEventListener('online', syncAndRefresh);
    window.addEventListener('offline', syncAndRefresh);
    syncAndRefresh();
    return () => {
      window.removeEventListener('online', syncAndRefresh);
      window.removeEventListener('offline', syncAndRefresh);
    };
  }, [syncAndRefresh]);

  function chooseUser(nextUser) {
    localStorage.setItem('visit-log-user', JSON.stringify(nextUser));
    setUser(nextUser);
  }

  function finishVisit() {
    setSchool(null);
    setScreen('visits');
    setRefreshKey((value) => value + 1);
  }

  return (
    <div className="app-shell">
      <AppBar className="topbar" position="sticky" elevation={0}>
        <Toolbar className="toolbar-content">
          <button className="brand-mark" onClick={() => setScreen('schools')} aria-label="School Visit Log home">VL</button>
          <div className="brand-copy"><strong>Visit Log</strong><span>FIELD NOTES</span></div>
          <div className="toolbar-spacer" />
          <div className={`connection ${online ? 'is-online' : 'is-offline'}`}><span />{online ? 'Online' : 'Offline'}</div>
          {user && <>
            <Button className="nav-button" onClick={() => { setSchool(null); setScreen('schools'); }}>New visit</Button>
            <Button className="nav-button" onClick={() => setScreen('visits')}>My visits</Button>
            <Button className="profile-button" onClick={() => setUser(null)} title="Change user"><Avatar>{user.userName.split(' ').map((part) => part[0]).join('')}</Avatar><span>{user.userName}</span></Button>
          </>}
        </Toolbar>
      </AppBar>
      <Container className="main-content" maxWidth="md">
        {!user && <UserPicker onChoose={chooseUser} />}
        {user && screen === 'schools' && !school && <SchoolSearch online={online} onSelect={(nextSchool) => { setSchool(nextSchool); setScreen('form'); }} />}
        {user && screen === 'form' && school && <VisitForm school={school} user={user} online={online} onDone={finishVisit} onBack={() => setScreen('schools')} />}
        {user && screen === 'visits' && <MyVisits user={user} online={online} refreshKey={refreshKey} />}
      </Container>
      <footer className="page-footer"><span>SCHOOL VISIT LOG</span><span>·</span><span>INDIA STANDARD TIME</span></footer>
    </div>
  );
}