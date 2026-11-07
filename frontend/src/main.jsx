import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ArrowRight, Eye, EyeOff } from 'lucide-react';
import { api } from './api';
import { Brand, Button, ErrorMessage, Field, Loading } from './components';
import Participant from './participant';
import Researcher from './researcher';
import '../styles.css';

function Auth({ onAuthenticated }) {
  const [signup, setSignup] = useState(false);
  const [visible, setVisible] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('participant');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('');
    try { const account = await api(signup ? '/auth/signup' : '/auth/login', 'POST', signup ? { name, email, password, role } : { email, password }); onAuthenticated(account); }
    catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }
  return <main className="auth-page"><header><Brand /></header><div className="auth-form"><h1>{signup ? 'Create your account' : 'Welcome to StudyMatch'}</h1><p>{signup ? 'Find research to take part in, or recruit for your own study.' : 'Find the right research, without the search'}</p><form onSubmit={submit}><ErrorMessage message={error} />{signup && <Field label="Your name"><input autoComplete="name" required maxLength="80" value={name} onChange={(event) => setName(event.target.value)} /></Field>}<Field label="Email address"><input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></Field><Field label="Password" hint={signup ? 'Use at least 8 characters.' : null}><span className="password-input"><input type={visible ? 'text' : 'password'} autoComplete={signup ? 'new-password' : 'current-password'} required minLength={signup ? 8 : undefined} maxLength="128" value={password} onChange={(event) => setPassword(event.target.value)} /><button type="button" className="icon-button" aria-label={visible ? 'Hide password' : 'Show password'} onClick={() => setVisible(!visible)}>{visible ? <EyeOff size={17} /> : <Eye size={17} />}</button></span></Field>{signup && <fieldset className="role-picker"><legend>I’m here to</legend><label className={role === 'participant' ? 'selected' : ''}><input type="radio" name="role" value="participant" checked={role === 'participant'} onChange={(event) => setRole(event.target.value)} /><span><strong>Take part in studies</strong><small>Participant</small></span></label><label className={role === 'researcher' ? 'selected' : ''}><input type="radio" name="role" value="researcher" checked={role === 'researcher'} onChange={(event) => setRole(event.target.value)} /><span><strong>Recruit participants</strong><small>Researcher</small></span></label></fieldset>}<Button className="full-width" disabled={busy}>{busy ? (signup ? 'Creating account…' : 'Signing in…') : signup ? 'Create account' : 'Sign in'}{!busy && <ArrowRight size={16} />}</Button></form><p className="auth-switch">{signup ? 'Already have an account?' : 'New to StudyMatch?'} <button className="text-button" onClick={() => { setSignup(!signup); setError(''); }}>{signup ? 'Sign in' : 'Create an account'}</button></p><details className="demo-accounts"><summary>Try a demo account</summary><p>Use either synthetic account with password <strong>StudyMatch2026!</strong></p><button className="demo-account" onClick={() => { setEmail('participant@studymatch.demo'); setPassword('StudyMatch2026!'); setSignup(false); }}><span>Participant</span><span>participant@studymatch.demo</span></button><button className="demo-account" onClick={() => { setEmail('researcher@studymatch.demo'); setPassword('StudyMatch2026!'); setSignup(false); }}><span>Researcher</span><span>researcher@studymatch.demo</span></button><p>Details fill the form; select Sign in to continue.</p></details></div><footer>Synthetic-data prototype. Accounts and bookings are stored on this device.</footer></main>;
}

function App() {
  const [account, setAccount] = useState(null);
  const [bootstrap, setBootstrap] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  async function start() {
    setLoading(true); setError('');
    try {
      setBootstrap(await api('/bootstrap'));
      try { setAccount(await api('/auth/me')); }
      catch (failure) { if (failure.status === 401) setAccount(null); else throw failure; }
    } catch (failure) { setError(failure.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { start(); }, []);
  async function logout() { try { await api('/auth/logout', 'POST'); setAccount(null); } catch (failure) { setError(failure.message); } }
  if (loading) return <div className="startup"><Brand /><Loading /></div>;
  if (error) return <div className="startup"><Brand /><ErrorMessage message={error} /><Button secondary onClick={start}>Reload workspace</Button></div>;
  if (!account) return <Auth onAuthenticated={setAccount} />;
  return account.role === 'participant' ? <Participant key={account.id} account={account} bootstrap={bootstrap} onLogout={logout} onAccountChange={setAccount} /> : <Researcher key={account.id} account={account} bootstrap={bootstrap} onLogout={logout} />;
}

createRoot(document.getElementById('root')).render(<App />);
