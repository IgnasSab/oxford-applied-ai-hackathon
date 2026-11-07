import { useEffect, useId, useState } from 'react';
import { ArrowLeft, ArrowRight, Bell, CalendarDays, CircleHelp, ClipboardCheck, Compass, FlaskConical, LogOut, PanelLeftClose, PanelLeftOpen, SlidersHorizontal, UserRound, X } from 'lucide-react';

export function Brand() {
  return <div className="brand" aria-label="StudyMatch"><span className="brand-mark"><FlaskConical size={18} strokeWidth={2} /></span><span className="brand-name">StudyMatch</span></div>;
}

export function Button({ children, secondary = false, className = '', ...props }) {
  return <button className={`button ${secondary ? 'secondary' : ''} ${className}`} {...props}>{children}</button>;
}

export function Field({ label, hint, children, wide = false }) {
  return <label className={`field ${wide ? 'wide' : ''}`}><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>;
}

export function BooleanField({ label, value, onChange, required = true }) {
  const name = useId();
  return <fieldset className="boolean-field"><legend>{label}</legend><div className="boolean-actions"><div className="yes-no">{[[true, 'Yes'], [false, 'No']].map(([answer, text]) => <label key={text} className={value === answer ? 'selected' : ''}><input type="radio" name={name} required={required} checked={value === answer} onChange={() => onChange(answer)} /><span>{text}</span></label>)}</div>{!required && value !== null && <button type="button" className="text-button" onClick={() => onChange(null)} aria-label={`Clear answer: ${label}`}>Clear</button>}</div></fieldset>;
}

export function ChoiceField({ label, value, options, onChange, required = true }) {
  const [custom, setCustom] = useState(Boolean(value && !options.includes(value)));
  useEffect(() => { if (value) setCustom(!options.includes(value)); }, [value, options]);
  return <div className="choice-field"><Field label={label}><select value={custom ? '__other' : value} required={required} onChange={(event) => { setCustom(event.target.value === '__other'); onChange(event.target.value === '__other' ? '' : event.target.value); }}><option value="">Choose an answer</option>{options.map((option) => <option key={option}>{option}</option>)}<option value="__other">Other</option></select></Field>{custom && <Field label={`Other ${label.toLowerCase()}`}><input value={value} required={required} maxLength="150" onChange={(event) => onChange(event.target.value)} /></Field>}</div>;
}

export function ErrorMessage({ message }) {
  return message ? <div className="message error" role="alert"><CircleHelp size={16} /><span>{message}</span></div> : null;
}

export function Empty({ icon: Icon = Compass, title, children, action }) {
  return <div className="empty"><Icon size={25} strokeWidth={1.5} /><h3>{title}</h3><p>{children}</p>{action}</div>;
}

export function Loading() {
  return <div className="skeleton" role="status" aria-label="Loading workspace"><div /><div /><div /></div>;
}

export function Heading({ title, description, children }) {
  return <div className="page-heading"><div><h1>{title}</h1>{description && <p>{description}</p>}</div>{children}</div>;
}

export function Back({ onClick, children = 'Back to studies' }) {
  return <button className="text-button back" onClick={onClick}><ArrowLeft size={15} />{children}</button>;
}

export function TagPicker({ topics, selected, onChange }) {
  return <div className="tag-picker">{topics.map((topic) => <label key={topic} className={selected.includes(topic) ? 'selected' : ''}><input type="checkbox" checked={selected.includes(topic)} onChange={() => onChange(selected.includes(topic) ? selected.filter((item) => item !== topic) : [...selected, topic])} /><span>{topic}</span></label>)}</div>;
}

export function Weights({ weights, onChange }) {
  return <div className="weights">{[['compensation', 'Earnings', 'Compensation per hour'], ['interest', 'Interests', 'Overlap with your interests'], ['convenience', 'Convenience', 'Time, travel and study setup']].map(([key, label, description]) => <label className="weight" key={key}><span>{label}<output>{weights[key]}<span> / 5</span></output></span><input type="range" aria-label={label} min="1" max="5" step="1" value={weights[key]} onChange={(event) => onChange({ ...weights, [key]: Number(event.target.value) })} /><small>{description}</small></label>)}</div>;
}

export function Shell({ account, view, setView, onLogout, children }) {
  const [collapsed, setCollapsed] = useState(false);
  const participant = account.role === 'participant';
  const navigation = participant ? [['studies', 'Discover studies', Compass], ['schedule', 'My schedule', CalendarDays], ['profile', 'Profile & preferences', SlidersHorizontal], ['notifications', 'Notifications', Bell]] : [['studies', 'My studies', FlaskConical], ['reviews', 'Review requests', ClipboardCheck], ['bookings', 'Bookings', CalendarDays]];
  return <div className={`app-shell ${collapsed ? 'navigation-collapsed' : ''}`}><a className="skip-link" href="#main-content">Skip to content</a><aside className="navigation"><div className="navigation-header"><Brand /><button className="icon-button navigation-toggle" aria-label={collapsed ? 'Open navigation' : 'Close navigation'} aria-expanded={!collapsed} aria-controls="main-navigation" onClick={() => setCollapsed(!collapsed)}>{collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}</button></div><div className="workspace-label">{participant ? 'Participant' : 'Researcher'}</div><nav id="main-navigation" aria-label="Main navigation">{navigation.map(([key, label, Icon]) => <button key={key} className={view === key ? 'active' : ''} aria-label={label} title={collapsed ? label : undefined} aria-current={view === key ? 'page' : undefined} onClick={() => setView(key)}><Icon size={17} /><span>{label}</span></button>)}</nav><div className="nav-bottom"><div className="demo-note" title="Synthetic-data demo"><span className="status-dot" /><span>{collapsed ? 'Demo' : 'Synthetic-data demo'}</span></div><div className="account"><span className="avatar"><UserRound size={17} /></span><div className="account-name"><strong>{account.name}</strong><span>{account.role}</span></div><button className="icon-button" onClick={onLogout} title="Log out" aria-label="Log out"><LogOut size={17} /></button></div></div></aside><main id="main-content" className="main-content">{children}</main></div>;
}

export function Notice({ children, onClose }) {
  return children ? <div className="notice" role="status"><span>{children}</span><button className="icon-button" aria-label="Dismiss message" onClick={onClose}><X size={16} /></button></div> : null;
}

export function NextIcon() { return <ArrowRight size={16} />; }
