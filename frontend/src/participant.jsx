import { useEffect, useState } from 'react';
import { Bell, CalendarDays, Check, CheckCircle2, ChevronRight, Clock3, MapPin, Monitor, Search } from 'lucide-react';
import { api, conflicts, dateLabel, formatLabel, money, scoreStudy, timeLabel } from './api';
import { Back, BooleanField, Button, Empty, ErrorMessage, Field, Heading, Loading, NextIcon, Notice, Shell } from './components';
import ProfileForm from './profile';
import Schedule from './calendar';

function Status({ study }) {
  const text = study.booked ? 'Booked' : study.status === 'eligible' ? 'Ready to book' : study.status === 'needs_screening' ? `${study.questions.length} question${study.questions.length === 1 ? '' : 's'} left` : study.review_status === 'pending' ? 'Review pending' : study.review_status === 'declined' ? 'Review declined' : 'Researcher review';
  return <span className={`status ${study.booked || study.status === 'eligible' ? 'success' : study.status === 'needs_screening' || study.review_status === 'pending' ? 'pending' : ''}`}><span className="status-dot" />{text}</span>;
}

function StudyRow({ study, weights, onSelect }) {
  const nextSlot = study.slots.find((slot) => slot.remaining > 0);
  return <article className="study-row"><button className="study-open" onClick={() => onSelect(study.id)}><div className="study-main"><div className="study-title-line"><h2>{study.title}</h2><Status study={study} /></div><p className="study-summary">{study.summary}</p><div className="study-meta"><strong>{money(study.compensation)}</strong><span><Clock3 size={13} />{study.duration} min</span><span>{study.mode === 'online' ? <Monitor size={13} /> : <MapPin size={13} />}{formatLabel(study.mode)}</span><span className="study-availability">{nextSlot ? `${dateLabel(nextSlot.starts_at)} · ${timeLabel(nextSlot.starts_at)}` : study.status === 'eligible' ? 'No available sessions' : 'Screening before scheduling'}</span></div></div><div className="study-score"><strong>{scoreStudy(study, weights).toFixed(1)}<span> / 5</span></strong><span>preference fit</span><ChevronRight size={17} /></div></button></article>;
}

function StudyDetail({ study, weights, bookings, onBack, onScreen, onBook, onRequestReview }) {
  const [answers, setAnswers] = useState({});
  const [selectedSlot, setSelectedSlot] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(event, action) {
    event.preventDefault(); setError(''); setBusy(true);
    try {
      if (action === 'screen') await onScreen(study.id, answers);
      else if (action === 'review') await onRequestReview(study.id, note);
      else await onBook(Number(selectedSlot));
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }
  return <div className="page detail-page"><Back onClick={onBack} />
    <Heading title={study.title} description={study.summary} />
    <div className="detail-facts"><span><strong>{money(study.compensation)}</strong>compensation</span><span><strong>{study.duration} min</strong>duration</span><span><strong>{formatLabel(study.mode)}</strong>{study.location}</span></div>
    <section className="detail-section"><h2>About this study</h2><p className="preserve-lines">{study.description}</p><div className="tag-list">{study.tags.map((tag) => <span className="tag" key={tag}>{tag}</span>)}</div></section>
    <section className="detail-section"><div className="section-title"><h2>Eligibility & booking</h2><Status study={study} /></div><ErrorMessage message={error} />
      {study.review_status === 'approved' && <p className="review-decision">Researcher review approved.{study.review_note && ` ${study.review_note}`}</p>}
      {study.booked ? <div className="message success"><CheckCircle2 size={18} /><div>You’re booked. Your session is in My schedule.</div></div> : study.status === 'manual_review' ? <>
        {study.review_status === 'pending' ? <p>Your request is with the researcher. Booking opens after their review and any remaining screening.</p> : study.review_status === 'declined' ? <p>The researcher declined this request.{study.review_note && ` ${study.review_note}`}</p> : <form onSubmit={(event) => submit(event, 'review')}><p>A researcher needs to check eligibility before you can book.</p><Field label="Message to the researcher" hint="Optional. Don’t include medical or other sensitive details."><textarea rows="3" value={note} maxLength="1000" onChange={(event) => setNote(event.target.value)} /></Field><Button className="section-action" disabled={busy}>{busy ? 'Sending…' : 'Request review'}<NextIcon /></Button></form>}
      </> : study.status === 'needs_screening' ? <form onSubmit={(event) => submit(event, 'screen')}>
        <div className="screen-questions">{study.questions.map((question) => question.answer_type === 'boolean' ? <BooleanField key={question.id} label={question.question} value={answers[question.id]} onChange={(value) => setAnswers({ ...answers, [question.id]: value })} /> : <Field key={question.id} label={question.question}>{question.answer_type === 'number' ? <input type="number" step="any" required value={answers[question.id] === undefined ? '' : answers[question.id]} onChange={(event) => setAnswers({ ...answers, [question.id]: event.target.value === '' ? '' : Number(event.target.value) })} /> : <select required value={answers[question.id] === undefined ? '' : answers[question.id]} onChange={(event) => setAnswers({ ...answers, [question.id]: event.target.value })}><option value="">Choose an answer</option>{question.choices.map((choice) => <option value={choice} key={choice}>{choice}</option>)}</select>}</Field>)}</div>
        <Button disabled={busy}>{busy ? 'Checking…' : 'Check eligibility'}<NextIcon /></Button>
      </form> : <>{study.slots.length ? <form onSubmit={(event) => submit(event, 'book')}><div className="slot-options">{study.slots.map((slot) => { const clash = conflicts(slot, study.duration, bookings); return <label key={slot.id} className={`slot-option ${String(slot.id) === selectedSlot ? 'selected' : ''} ${slot.remaining === 0 || clash ? 'unavailable' : ''}`}><input type="radio" name="session" required value={slot.id} checked={String(slot.id) === selectedSlot} onChange={(event) => setSelectedSlot(event.target.value)} disabled={slot.remaining === 0 || clash} /><span><strong>{dateLabel(slot.starts_at)}</strong><small>{timeLabel(slot.starts_at)} · {study.duration} min</small></span><span className="slot-capacity">{slot.remaining === 0 ? 'Full' : clash ? 'Schedule conflict' : `${slot.remaining} places left`}</span></label>; })}</div><p className="small-note">All times Europe/London.</p><Button disabled={busy || !selectedSlot}>{busy ? 'Booking…' : 'Confirm booking'}<Check size={16} /></Button></form> : <Empty icon={CalendarDays} title="No sessions available">Check back when the researcher adds a session.</Empty>}</>}
    </section>
    <details className="detail-section match-explanation"><summary>Preference fit · {scoreStudy(study, weights).toFixed(1)} / 5</summary><div className="score-breakdown">{[['compensation','Earnings'],['interest','Interests'],['convenience','Convenience']].map(([key,label]) => <div key={key}><span>{label}</span><strong>{study.components[key].toFixed(1)}<span> / 5</span></strong></div>)}</div><p className="small-note">{study.convenience_reason}</p><p className="small-note">Preference fit does not determine eligibility.</p></details>
  </div>;

}

function Notifications({ matches, onSelect }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  async function load() {
    setLoading(true); setError('');
    try { const result = await api('/notifications'); setNotifications(result.notifications); }
    catch (failure) { setError(failure.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);
  return <div className="page notifications-page"><Heading title="Notifications" description="Match alerts, booking confirmations and review updates. In-app demo only." /><ErrorMessage message={error} />{error && <Button secondary onClick={load}>Try again</Button>}{loading ? <Loading /> : notifications.length ? <div className="notification-list">{notifications.map((notification) => <article className="notification-row" key={notification.id}><div className="notification-meta"><span>{({ eligible: 'Study match', potential: 'Potential match', booking: 'Booking', review: 'Researcher review' })[notification.kind]}</span><time dateTime={notification.created_at}>{dateLabel(notification.created_at)} · {timeLabel(notification.created_at)}</time></div><h2>{notification.title}</h2><p>{notification.message}</p>{matches.some((match) => match.id === notification.study_id) && <button className="text-button" onClick={() => onSelect(notification.study_id)}>View study<ChevronRight size={14} /></button>}</article>)}</div> : !error && <Empty icon={Bell} title="No notifications yet">Your booking and review updates will appear here.</Empty>}</div>;
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
  const [topic, setTopic] = useState('any');
  const [status, setStatus] = useState('any');
  const [notice, setNotice] = useState('');
  async function load() {
    setError(''); setLoading(true);
    try { const saved = await api('/profile'); setProfile(saved); if (saved) setWeights(saved.weights); if (account.onboarded) setData(await api('/matches')); }
    catch (failure) { setError(failure.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);
  async function saveProfile(draft) {
    const saved = await api('/profile', 'PUT', draft);
    setProfile(saved); setWeights(saved.weights); setData(await api('/matches'));
    onAccountChange({ ...account, name: saved.name, onboarded: true });
    if (!account.onboarded) setView('studies');
    setSelected(null); setNotice('Questionnaire saved.');
  }
  async function savePreferences(preferences) {
    const saved = await api('/preferences', 'PATCH', preferences);
    setProfile(saved); setWeights(saved.weights);
    if (account.onboarded) setData(await api('/matches'));
    setNotice('Preferences saved.');
  }
  async function screen(studyId, answers) {
    const result = await api('/answers', 'POST', { study_id: studyId, answers });
    setData(await api('/matches'));
    if (result.status === 'ineligible') { setSelected(null); setNotice('This study isn’t a match based on your answers.'); }
    else setNotice(result.status === 'eligible' ? 'Requirements met. Choose a session.' : 'Answers saved. Researcher review is needed.');
  }
  async function requestReview(studyId, note) { await api('/review-requests', 'POST', { study_id: studyId, note }); setData(await api('/matches')); setNotice('Review requested.'); }
  async function book(slotId) { const booking = await api('/bookings', 'POST', { slot_id: slotId }); setData(await api('/matches')); setNotice(`Booked: ${booking.title} · ${dateLabel(booking.starts_at)}, ${timeLabel(booking.starts_at)}.`); }
  function navigate(nextView) { setView(nextView); setSelected(null); setError(''); window.scrollTo({ top: 0 }); }
  function selectStudy(id) { setSelected(id); setView('studies'); window.scrollTo({ top: 0 }); }
  const study = data.matches.find((match) => match.id === selected);
  const visible = data.matches.filter((match) => {
    if (format !== 'any' && match.mode !== format) return false;
    if (topic !== 'any' && !match.tags.includes(topic)) return false;
    if (status !== 'any' && match.status !== status) return false;
    if (!`${match.title} ${match.summary} ${match.tags.join(' ')}`.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  }).sort((first, second) => scoreStudy(second, weights) - scoreStudy(first, weights));
  return <Shell account={account} view={view} setView={navigate} onLogout={onLogout}><Notice onClose={() => setNotice('')}>{notice}</Notice>
    {loading ? <Loading /> : error && !profile ? <div className="page"><ErrorMessage message={error} /><Button secondary onClick={load}>Try again</Button></div> : !account.onboarded || view === 'profile' ? <ProfileForm key={account.onboarded ? 'edit' : 'onboard'} profile={profile} account={account} bootstrap={bootstrap} onSave={saveProfile} onSavePreferences={savePreferences} onCancel={account.onboarded ? () => navigate('studies') : null} /> : view === 'schedule' ? <Schedule matches={data.matches} bookings={data.bookings} onSelect={selectStudy} onBook={book} /> : view === 'notifications' ? <Notifications matches={data.matches} onSelect={selectStudy} /> : study ? <StudyDetail key={study.id} study={study} weights={weights} bookings={data.bookings} onBack={() => setSelected(null)} onScreen={screen} onBook={book} onRequestReview={requestReview} /> : <div className="page discovery-page">
      <Heading title="Discover studies" /><ErrorMessage message={error} />
      <section className="discovery-list"><div className="list-toolbar"><div className="segmented" aria-label="Study format">{[['any','All studies'],['online','Online'],['in_person','In person']].map(([key,label]) => <button key={key} aria-pressed={format === key} className={format === key ? 'active' : ''} onClick={() => setFormat(key)}>{label}</button>)}</div><label className="search"><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Search studies" placeholder="Search studies" /></label></div><div className="study-filters"><Field label="Topic"><select value={topic} onChange={(event) => setTopic(event.target.value)}><option value="any">All topics</option>{bootstrap.topics.map((item) => <option key={item}>{item}</option>)}</select></Field><Field label="Eligibility"><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="any">All matches</option><option value="eligible">Eligible immediately</option><option value="needs_screening">Potential matches</option><option value="manual_review">Researcher review</option></select></Field></div><div className="list-caption"><span>{visible.length} {visible.length === 1 ? 'study' : 'studies'}</span></div>
        {visible.length ? <div className="study-list" aria-live="polite">{visible.map((match) => <StudyRow key={match.id} study={match} weights={weights} onSelect={selectStudy} />)}</div> : <Empty title="No studies in this view">Try another topic, format or eligibility filter, or update your preferences.</Empty>}
      </section>
    </div>}
  </Shell>;
}
