import { useEffect, useState } from 'react';
import { ArrowUpRight, Bell, CalendarDays, Check, CheckCircle2, ChevronRight, Clock3, Compass, MapPin, Monitor, Search, SlidersHorizontal, Users } from 'lucide-react';
import { api, dateLabel, formatLabel, money, scoreStudy, timeLabel } from './api';
import { Back, Button, Empty, ErrorMessage, Field, Heading, Loading, NextIcon, Notice, Shell, TagPicker, Weights } from './components';

const newProfile = (name) => ({ name, age: '', handedness: '', first_language: '', english: '', vision: '', psychology_background: '', university: '', free_response: '', interests: [], preferred_mode: 'any', preferred_location: '', max_duration: 480, preferred_times: [], notifications: 'off', weights: { interest: 3, compensation: 3, convenience: 3 } });

function BooleanField({ label, value, onChange }) {
  return <Field label={label}><select value={String(value)} required onChange={(event) => onChange(event.target.value === '' ? '' : event.target.value === 'true')}><option value="">Choose an answer</option><option value="true">Yes</option><option value="false">No</option></select></Field>;
}

function ProfileForm({ profile, account, topics, onSave, onCancel }) {
  const [draft, setDraft] = useState(profile || newProfile(account.name));
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const update = (key, value) => setDraft((current) => ({ ...current, [key]: value }));
  async function submit(event) {
    event.preventDefault();
    if (step === 1) { setStep(2); window.scrollTo({ top: 0 }); return; }
    setBusy(true); setError('');
    try { await onSave(draft); }
    catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }
  return <div className="page form-page"><Heading title={profile ? 'Profile & preferences' : 'Make this your workspace'} description={profile ? 'Your reusable answers and the things that matter to you.' : 'Answer once. We’ll only ask for more when a study needs it.'} /><div className="stepper" aria-label={`Step ${step} of 2`}><span className={step === 1 ? 'current' : 'complete'}><span>{step > 1 ? <Check size={13} /> : '1'}</span>About you</span><div /><span className={step === 2 ? 'current' : ''}><span>2</span>Your preferences</span></div><form onSubmit={submit}><ErrorMessage message={error} />{step === 1 ? <><section className="form-section"><h2>A short prescreen</h2><p>These answers check study requirements. Use fictional details in this demo.</p><div className="form-grid"><Field label="Display name"><input value={draft.name} onChange={(event) => update('name', event.target.value)} required maxLength="80" autoComplete="name" /></Field><Field label="Age"><input type="number" min="18" max="120" value={draft.age} onChange={(event) => update('age', event.target.value === '' ? '' : Number(event.target.value))} required /></Field><Field label="Handedness"><select value={draft.handedness} onChange={(event) => update('handedness', event.target.value)} required><option value="">Choose an answer</option><option value="right">Right-handed</option><option value="left">Left-handed</option><option value="ambidextrous">Ambidextrous</option></select></Field><Field label="First language"><input value={draft.first_language} onChange={(event) => update('first_language', event.target.value)} placeholder="e.g. English" required maxLength="80" /></Field><BooleanField label="Are you fluent in English?" value={draft.english} onChange={(value) => update('english', value)} /><BooleanField label="Normal or corrected-to-normal vision?" value={draft.vision} onChange={(value) => update('vision', value)} /><BooleanField label="Have you studied psychology?" value={draft.psychology_background} onChange={(value) => update('psychology_background', value)} /><Field label="University affiliation" hint="Enter “None” if you are not affiliated."><input value={draft.university} onChange={(event) => update('university', event.target.value)} required maxLength="150" placeholder="e.g. University of Oxford" /></Field></div></section><section className="form-section"><h2>Anything you’d enjoy?</h2><Field label="What would you enjoy taking part in?" hint="Optional. This note doesn’t determine eligibility."><textarea rows="3" value={draft.free_response} onChange={(event) => update('free_response', event.target.value)} maxLength="1000" placeholder="I enjoy strategy games and learning how people make decisions…" /></Field></section></> : <><section className="form-section"><h2>Your interests</h2><p>Choose any that appeal to you. These shape your study rankings.</p><TagPicker topics={topics} selected={draft.interests} onChange={(value) => update('interests', value)} /></section><section className="form-section"><h2>What works for you?</h2><p>Preferences help you browse. They never change scientific eligibility.</p><div className="form-grid"><Field label="Preferred format"><select value={draft.preferred_mode} onChange={(event) => update('preferred_mode', event.target.value)}><option value="any">Online or in person</option><option value="online">Online</option><option value="in_person">In person</option></select></Field><Field label="Preferred maximum duration"><select value={draft.max_duration} onChange={(event) => update('max_duration', Number(event.target.value))}>{[15,30,45,60,90,120,240,480].map((value) => <option key={value} value={value}>{value === 480 ? 'No preference' : `${value} minutes`}</option>)}</select></Field><Field label="Preferred location" hint="Optional; used when you apply preference filters."><input value={draft.preferred_location} onChange={(event) => update('preferred_location', event.target.value)} placeholder="e.g. Oxford" maxLength="150" /></Field><Field label="Match alerts" hint="Simulated in this workspace. No email is sent."><select value={draft.notifications} onChange={(event) => update('notifications', event.target.value)}><option value="off">Off</option><option value="immediate">When a match is available</option><option value="weekly">Weekly summary</option></select></Field></div><fieldset className="plain-fieldset"><legend>Preferred times <span>(optional)</span></legend><div className="check-row">{['morning','afternoon','evening'].map((time) => <label className="check" key={time}><input type="checkbox" checked={draft.preferred_times.includes(time)} onChange={() => update('preferred_times', draft.preferred_times.includes(time) ? draft.preferred_times.filter((item) => item !== time) : [...draft.preferred_times, time])} /><span className="capitalize">{time}</span></label>)}</div></fieldset></section><section className="form-section"><h2>Set your priorities</h2><p>Higher values give that preference more influence.</p><Weights weights={draft.weights} onChange={(value) => update('weights', value)} /></section></>}<div className="form-actions"><div>{step === 2 ? <Button type="button" secondary onClick={() => { setStep(1); setError(''); }}>Back</Button> : onCancel && <Button type="button" secondary onClick={onCancel}>Cancel</Button>}</div><Button disabled={busy}>{busy ? 'Saving…' : step === 1 ? 'Continue' : profile ? 'Save changes' : 'Find my studies'}{!busy && <NextIcon />}</Button></div></form></div>;
}

function Status({ study }) {
  const text = study.booked ? 'Booked' : study.status === 'eligible' ? 'Ready to book' : study.status === 'needs_screening' ? `${study.questions.length} question${study.questions.length === 1 ? '' : 's'} left` : 'Researcher review';
  return <span className={`status ${study.booked || study.status === 'eligible' ? 'success' : study.status === 'needs_screening' ? 'pending' : ''}`}><span className="status-dot" />{text}</span>;
}

function StudyRow({ study, weights, onSelect }) {
  const nextSlot = study.slots.find((slot) => slot.remaining > 0);
  return <article className="study-row"><button className="study-open" onClick={() => onSelect(study.id)}><div className="study-main"><div className="study-title-line"><h2>{study.title}</h2><Status study={study} /></div><p className="study-summary">{study.summary}</p><div className="study-meta"><strong>{money(study.compensation)}</strong><span><Clock3 size={13} />{study.duration} min</span><span>{study.mode === 'online' ? <Monitor size={13} /> : <MapPin size={13} />}{formatLabel(study.mode)}</span><span className="study-availability">{nextSlot ? `${dateLabel(nextSlot.starts_at)} · ${timeLabel(nextSlot.starts_at)}` : study.status === 'eligible' ? 'No available sessions' : 'Screening before scheduling'}</span></div></div><div className="study-score"><strong>{scoreStudy(study, weights).toFixed(1)}<span> / 5</span></strong><span>preference fit</span><ChevronRight size={17} /></div></button></article>;
}

function conflicts(slot, duration, bookings) {
  const starts = new Date(slot.starts_at).getTime();
  return bookings.some((booking) => starts < new Date(booking.starts_at).getTime() + booking.duration * 60000 && starts + duration * 60000 > new Date(booking.starts_at).getTime());
}

function StudyDetail({ study, weights, bookings, onBack, onScreen, onBook }) {
  const [answers, setAnswers] = useState({});
  const [selectedSlot, setSelectedSlot] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(event, screening) {
    event.preventDefault(); setError(''); setBusy(true);
    try { if (screening) await onScreen(study.id, answers); else await onBook(Number(selectedSlot)); }
    catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }
  return <div className="page detail-page"><Back onClick={onBack} /><div className="detail-layout"><div><Heading title={study.title} description={study.summary} /><div className="detail-facts"><span><strong>{money(study.compensation)}</strong>compensation</span><span><strong>{study.duration} min</strong>duration</span><span><strong>{formatLabel(study.mode)}</strong>{study.location}</span></div><section className="detail-section"><h2>About this study</h2><p className="preserve-lines">{study.description}</p><div className="tag-list">{study.tags.map((tag) => <span className="tag" key={tag}>{tag}</span>)}</div></section><section className="detail-section"><div className="section-title"><h2>Eligibility & booking</h2><Status study={study} /></div><ErrorMessage message={error} />{study.booked ? <div className="message success"><CheckCircle2 size={18} /><div><strong>You’re booked.</strong> Your session is in My schedule.</div></div> : study.status === 'manual_review' ? <div className="message"><Users size={18} /><div>This study needs researcher-led review. Automatic screening and booking are unavailable.</div></div> : study.status === 'needs_screening' ? <form onSubmit={(event) => submit(event, true)}><p>We already have your prescreen answers. Just {study.questions.length === 1 ? 'one study-specific question remains' : `${study.questions.length} study-specific questions remain`}.</p><div className="screen-questions">{study.questions.map((question) => <Field key={question.id} label={question.question}>{question.answer_type === 'number' ? <input type="number" step="any" required value={answers[question.id] === undefined ? '' : answers[question.id]} onChange={(event) => setAnswers({ ...answers, [question.id]: event.target.value === '' ? '' : Number(event.target.value) })} /> : <select required value={answers[question.id] === undefined ? '' : String(answers[question.id])} onChange={(event) => setAnswers({ ...answers, [question.id]: question.answer_type === 'boolean' ? (event.target.value === '' ? '' : event.target.value === 'true') : event.target.value })}><option value="">Choose an answer</option>{question.answer_type === 'boolean' ? <><option value="true">Yes</option><option value="false">No</option></> : question.choices.map((choice) => <option value={choice} key={choice}>{choice}</option>)}</select>}</Field>)}</div><p className="small-note">Answers are checked against researcher-approved criteria.</p><Button disabled={busy}>{busy ? 'Checking…' : 'Check eligibility'}<NextIcon /></Button></form> : <><p>Your answers meet the listed requirements. Choose a session below.</p>{study.slots.length ? <form onSubmit={(event) => submit(event, false)}><div className="slot-options">{study.slots.map((slot) => { const clash = conflicts(slot, study.duration, bookings); return <label key={slot.id} className={`slot-option ${String(slot.id) === selectedSlot ? 'selected' : ''} ${slot.remaining === 0 || clash ? 'unavailable' : ''}`}><input type="radio" name="session" required value={slot.id} checked={String(slot.id) === selectedSlot} onChange={(event) => setSelectedSlot(event.target.value)} disabled={slot.remaining === 0 || clash} /><span><strong>{dateLabel(slot.starts_at)}</strong><small>{timeLabel(slot.starts_at)} · {study.duration} min</small></span><span className="slot-capacity">{slot.remaining === 0 ? 'Full' : clash ? 'Schedule conflict' : `${slot.remaining} places left`}</span></label>; })}</div><p className="small-note">All times Europe/London. A booking is saved only after confirmation.</p><Button disabled={busy || !selectedSlot}>{busy ? 'Booking…' : 'Confirm booking'}<Check size={16} /></Button></form> : <Empty icon={CalendarDays} title="No sessions available">Check back when the researcher adds a session.</Empty>}</>}</section></div><aside className="detail-aside"><div className="fit-summary"><span>Your preference fit</span><strong>{scoreStudy(study, weights).toFixed(1)}<small> / 5</small></strong><p>{study.status === 'eligible' ? 'Based on your priorities.' : 'Provisional ranking. Eligibility still needs confirmation.'}</p></div><div className="score-breakdown">{[['compensation','Earnings'],['interest','Interests'],['convenience','Convenience']].map(([key,label]) => <div key={key}><span>{label}</span><strong>{study.components[key].toFixed(1)}<span> / 5</span></strong></div>)}</div><p className="small-note">{study.convenience_reason}</p><p className="small-note">Preference fit is not a probability of eligibility.</p>{bookings.length > 0 && <section className="aside-section"><h3>Your next booking</h3><strong>{bookings[0].title}</strong><p>{dateLabel(bookings[0].starts_at)} · {timeLabel(bookings[0].starts_at)}</p></section>}</aside></div></div>;
}

function Schedule({ matches, bookings, onSelect, onBook }) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(null);
  const [showAvailable, setShowAvailable] = useState(true);
  const available = matches.filter((study) => study.status === 'eligible' && !study.booked).flatMap((study) => study.slots.filter((slot) => slot.remaining > 0).map((slot) => ({ ...slot, study_id: study.id, title: study.title, duration: study.duration, location: study.location, mode: study.mode, available: true, conflict: conflicts(slot, study.duration, bookings) })));
  const entries = [...bookings, ...(showAvailable ? available : [])].sort((a,b) => new Date(a.starts_at) - new Date(b.starts_at));
  const dates = [...new Set(entries.map((entry) => dateLabel(entry.starts_at)))];
  async function book(slot) { setBusy(slot.id); setError(''); try { await onBook(slot.id); } catch (failure) { setError(failure.message); } finally { setBusy(null); } }
  return <div className="page"><Heading title="My schedule" description="Your bookings and available sessions, all in one place." /><div className="schedule-toolbar"><span><span className="status-dot success" />{bookings.length} confirmed booking{bookings.length === 1 ? '' : 's'}</span><label className="check"><input type="checkbox" checked={showAvailable} onChange={(event) => setShowAvailable(event.target.checked)} />Show available sessions</label></div><ErrorMessage message={error} /><p className="small-note">All times Europe/London. Only studies you’re eligible for appear here.</p>{entries.length === 0 ? <Empty icon={CalendarDays} title="Your schedule is clear">Find a study, complete any remaining questions, then choose a session.</Empty> : <div className="agenda">{dates.map((date) => <section className="agenda-day" key={date}><h2>{date}</h2><div>{entries.filter((entry) => dateLabel(entry.starts_at) === date).map((entry) => <div key={`${entry.available ? 'slot' : 'booking'}-${entry.id}`} className={`agenda-entry ${entry.available ? '' : 'confirmed'}`}><span className="agenda-time">{timeLabel(entry.starts_at)}<small>{entry.duration} min</small></span><div className="agenda-content"><button className="text-button" onClick={() => onSelect(entry.study_id)}>{entry.title}<ArrowUpRight size={13} /></button><span>{entry.location}</span></div>{entry.available ? <Button secondary disabled={entry.conflict || busy === entry.id} onClick={() => book(entry)}>{entry.conflict ? 'Conflict' : busy === entry.id ? 'Booking…' : 'Book session'}</Button> : <span className="status success"><CheckCircle2 size={14} />Confirmed</span>}</div>)}</div></section>)}</div>}</div>;
}

export default function Participant({ account, bootstrap, onLogout, onAccountChange }) {
  const [profile, setProfile] = useState(null);
  const [data, setData] = useState({ matches: [], bookings: [], notifications: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [view, setView] = useState('studies');
  const [selected, setSelected] = useState(null);
  const [weights, setWeights] = useState({ interest: 3, compensation: 3, convenience: 3 });
  const [query, setQuery] = useState('');
  const [format, setFormat] = useState('any');
  const [filterPreferences, setFilterPreferences] = useState(false);
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);
  const [prioritiesOpen, setPrioritiesOpen] = useState(() => window.matchMedia('(min-width: 901px)').matches);
  useEffect(() => {
    const query = window.matchMedia('(min-width: 901px)');
    const resize = (event) => setPrioritiesOpen(event.matches);
    query.addEventListener('change', resize);
    return () => query.removeEventListener('change', resize);
  }, []);
  async function load() {
    setError(''); setLoading(true);
    try { const saved = await api('/profile'); setProfile(saved); if (saved) { setWeights(saved.weights); setData(await api('/matches')); } }
    catch (failure) { setError(failure.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);
  async function saveProfile(draft) {
    const saved = await api('/profile', 'PUT', draft);
    setProfile(saved); setWeights(saved.weights); setData(await api('/matches'));
    onAccountChange({ ...account, name: saved.name, onboarded: true });
    setView('studies'); setSelected(null); setNotice('Profile saved. Your matches are ready.');
  }
  async function saveWeights() {
    setSaving(true); setError('');
    try { const saved = await api('/profile', 'PUT', { ...profile, weights }); setProfile(saved); setData(await api('/matches')); setNotice('Priorities saved.'); }
    catch (failure) { setError(failure.message); }
    finally { setSaving(false); }
  }
  async function screen(studyId, answers) {
    const result = await api('/answers', 'POST', { study_id: studyId, answers });
    setData(await api('/matches'));
    if (result.status === 'ineligible') { setSelected(null); setNotice('This study isn’t a match based on your answers. Your other studies are ready.'); }
    else setNotice(result.status === 'eligible' ? 'Requirements met. Choose a session to book.' : 'Answers saved. Further screening or review is needed.');
  }
  async function book(slotId) { const booking = await api('/bookings', 'POST', { slot_id: slotId }); setData(await api('/matches')); setNotice(`Booked: ${booking.title} · ${dateLabel(booking.starts_at)}, ${timeLabel(booking.starts_at)}.`); }
  function navigate(nextView) { setView(nextView); setSelected(null); setError(''); window.scrollTo({ top: 0 }); }
  function selectStudy(id) { setSelected(id); setView('studies'); window.scrollTo({ top: 0 }); }
  const study = data.matches.find((match) => match.id === selected);
  const visible = data.matches.filter((match) => {
    if (format !== 'any' && match.mode !== format) return false;
    if (!`${match.title} ${match.summary} ${match.tags.join(' ')}`.toLowerCase().includes(query.toLowerCase())) return false;
    if (!filterPreferences) return true;
    if (profile.preferred_mode !== 'any' && match.mode !== profile.preferred_mode) return false;
    if (match.duration > profile.max_duration) return false;
    if (profile.preferred_location && match.mode !== 'online' && !match.location.toLowerCase().includes(profile.preferred_location.toLowerCase())) return false;
    if (profile.preferred_times.length && match.status === 'eligible' && !match.slots.some((slot) => { const hour = Number(new Date(slot.starts_at).toLocaleTimeString('en-GB', { timeZone: 'Europe/London', hour: '2-digit', hour12: false })); return profile.preferred_times.includes(hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening'); })) return false;
    return true;
  }).sort((a,b) => scoreStudy(b, weights) - scoreStudy(a, weights));
  return <Shell account={account} view={view} setView={navigate} onLogout={onLogout}><Notice onClose={() => setNotice('')}>{notice}</Notice>{loading ? <Loading /> : error && !profile ? <div className="page"><ErrorMessage message={error} /><Button secondary onClick={load}>Try again</Button></div> : !profile || view === 'profile' ? <ProfileForm key={profile ? 'edit' : 'onboard'} profile={profile} account={account} topics={bootstrap.topics} onSave={saveProfile} onCancel={profile ? () => navigate('studies') : null} /> : view === 'schedule' ? <Schedule matches={data.matches} bookings={data.bookings} onSelect={selectStudy} onBook={book} /> : study ? <StudyDetail key={study.id} study={study} weights={weights} bookings={data.bookings} onBack={() => setSelected(null)} onScreen={screen} onBook={book} /> : <div className="page discovery-page"><Heading title="Discover studies" description="Research that fits your interests, priorities and schedule." /><ErrorMessage message={error} /><div className="discovery-layout"><section className="discovery-list"><div className="list-toolbar"><div className="segmented" aria-label="Study format">{[['any','All studies'],['online','Online'],['in_person','In person']].map(([key,label]) => <button key={key} aria-pressed={format === key} className={format === key ? 'active' : ''} onClick={() => setFormat(key)}>{label}</button>)}</div><label className="search"><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Search studies" placeholder="Search studies" /></label></div><div className="list-caption"><span>{visible.length} studies{filterPreferences ? ' · preference filters on' : ''}</span><span>Best preference fit first</span></div>{visible.length ? <div className="study-list" aria-live="polite">{visible.map((match) => <StudyRow key={match.id} study={match} weights={weights} onSelect={selectStudy} />)}</div> : <Empty title="No studies in this view">Try another format, clear your search, or turn off preference filters.</Empty>}<p className="list-footnote">Rankings reflect your preferences. Additional screening may still be required.</p></section><aside className="priorities-aside"><details className="priorities-disclosure" open={prioritiesOpen} onToggle={(event) => setPrioritiesOpen(event.currentTarget.open)}><summary><SlidersHorizontal size={16} /><span>Your priorities</span><ChevronRight size={15} /></summary><div className="priorities-content"><p>Move a slider to reorder your studies.</p><Weights weights={weights} onChange={setWeights} /><Button secondary className="full-width" disabled={saving || JSON.stringify(weights) === JSON.stringify(profile.weights)} onClick={saveWeights}>{saving ? 'Saving…' : 'Save priorities'}</Button><label className="check filter-check"><input type="checkbox" checked={filterPreferences} onChange={(event) => setFilterPreferences(event.target.checked)} />Apply my format, time and location preferences</label><button className="text-button" onClick={() => navigate('profile')}>Edit interests & preferences<ArrowUpRight size={13} /></button></div></details><section className="aside-section"><div className="section-title"><h3>Next session</h3><CalendarDays size={15} /></div>{data.bookings.length ? <><strong>{data.bookings[0].title}</strong><p>{dateLabel(data.bookings[0].starts_at)} · {timeLabel(data.bookings[0].starts_at)}</p><button className="text-button" onClick={() => navigate('schedule')}>Open schedule<ArrowUpRight size={13} /></button></> : <p>No bookings yet. Choose a study to find your first session.</p>}</section><section className="aside-section"><div className="section-title"><h3>Match alerts</h3><Bell size={15} /></div><p className="small-note">Simulated in-app{profile.notifications === 'weekly' ? ' weekly summary' : ''}.</p>{profile.notifications === 'off' ? <p>Alerts are off. Enable them in your preferences.</p> : data.notifications.length ? data.notifications.slice(0,2).map((notification) => <button className="notification-item" key={notification.id} onClick={() => selectStudy(notification.study_id)}><strong>{notification.title}</strong><span>{notification.message}</span></button>) : <p>No new alerts right now.</p>}</section></aside></div></div>}</Shell>;
}
