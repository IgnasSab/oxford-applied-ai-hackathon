import { useEffect, useState } from 'react';
import { ArrowUpRight, CalendarDays, CheckCircle2, ChevronRight, ClipboardCheck, FileText, FlaskConical, Plus, Trash2, Upload } from 'lucide-react';
import { api, dateLabel, formatLabel, money, timeLabel } from './api';
import { Back, Button, ChoiceField, Empty, ErrorMessage, Field, Heading, Loading, Notice, Shell, TagPicker } from './components';

const blankStudy = { title: '', description: '', mode: 'online', location: 'Online', duration: 30, compensation: 0, tags: [] };

function nextSession() {
  const date = new Date();
  date.setDate(date.getDate() + 2);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}T14:00`;
}

function SlotsEditor({ slots, onChange }) {
  return <><p className="small-note">Enter times in your device’s timezone. Participants see Europe/London times.</p>{slots.map((slot, index) => <div className="slot-edit" key={index}><Field label={`Session ${index + 1} start`}><input type="datetime-local" required value={slot.starts_at} onChange={(event) => onChange(slots.map((existing, position) => position === index ? { ...existing, starts_at: event.target.value } : existing))} /></Field><Field label="Places"><input type="number" min="1" max="100" required value={slot.capacity} onChange={(event) => onChange(slots.map((existing, position) => position === index ? { ...existing, capacity: Number(event.target.value) } : existing))} /></Field><button type="button" className="icon-button" onClick={() => onChange(slots.filter((_, position) => position !== index))} aria-label={`Remove session ${index + 1}`}><Trash2 size={16} /></button></div>)}<Button type="button" secondary onClick={() => onChange([...slots, { starts_at: nextSession(), capacity: 3 }])}><Plus size={15} />Add session</Button></>;
}

const slotPayload = (slots) => slots.map((slot) => ({ starts_at: new Date(slot.starts_at).toISOString(), capacity: slot.capacity }));

function CreateStudy({ bootstrap, onBack, onPublish }) {
  const [study, setStudy] = useState(blankStudy);
  const [draft, setDraft] = useState(null);
  const [source, setSource] = useState('');
  const [file, setFile] = useState(null);
  const [importMethod, setImportMethod] = useState('pdf');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [approved, setApproved] = useState(false);
  const [slots, setSlots] = useState([{ starts_at: nextSession(), capacity: 3 }]);
  function invalidateDraft() { setDraft(null); setApproved(false); }
  function change(key, value) { setStudy((current) => ({ ...current, [key]: value })); invalidateDraft(); }
  async function extract(kind) {
    setBusy(kind); setError('');
    try {
      let extraction;
      if (kind === 'pdf') { const body = new FormData(); body.append('file', file); extraction = await api('/extract/pdf', 'POST', body); }
      else extraction = await api('/extract', 'POST', { description: kind === 'sample' ? bootstrap.sample_description : source, demo: kind === 'sample' });
      const fields = extraction.fields;
      setStudy({ title: fields.title, description: `${fields.description}${fields.requirements ? `\n\nEligibility:\n${fields.requirements}` : ''}`, mode: fields.mode, location: fields.location, duration: fields.duration, compensation: fields.compensation, tags: fields.tags });
      setSource(extraction.source_text); setDraft(extraction); setApproved(false);
    } catch (failure) { setError(failure.message); }
    finally { setBusy(''); }
  }
  async function prepare(event) {
    event.preventDefault();
    if (!study.tags.length) { setError('Choose at least one study topic before preparing the preview.'); return; }
    setBusy('prepare'); setError('');
    try { setDraft(await api('/studies/prepare', 'POST', study)); setApproved(false); }
    catch (failure) { setError(failure.message); }
    finally { setBusy(''); }
  }
  async function publish(event) {
    event.preventDefault(); setBusy('publish'); setError('');
    try { await onPublish({ draft_id: draft.draft_id, approved, slots: slotPayload(slots) }); }
    catch (failure) { setError(failure.message); }
    finally { setBusy(''); }
  }
  return <div className="page create-page"><Back onClick={onBack}>Back to my studies</Back><Heading title="Create a study" />
    <details className="import-section"><summary><FileText size={17} />Simple PDF or text import<ChevronRight size={15} /></summary><div className="import-tabs segmented" aria-label="Import method">{[['pdf','Upload PDF'],['text','Paste text']].map(([key,label]) => <button type="button" key={key} aria-pressed={importMethod === key} className={importMethod === key ? 'active' : ''} onClick={() => setImportMethod(key)}>{label}</button>)}</div>
      {importMethod === 'pdf' ? <div className="upload-row"><Field label="Study information PDF" hint="Text PDFs, up to 5 MB and 20 pages."><input type="file" accept="application/pdf,.pdf" disabled={Boolean(busy)} onChange={(event) => { setFile(event.target.files[0] || null); invalidateDraft(); }} /></Field><Button type="button" secondary disabled={!file || Boolean(busy) || !bootstrap.ai_available} onClick={() => extract('pdf')}><Upload size={15} />{busy === 'pdf' ? 'Reading PDF…' : 'Import PDF'}</Button></div> : <><Field label="Study document text"><textarea rows="5" value={source} disabled={Boolean(busy)} onChange={(event) => { setSource(event.target.value); invalidateDraft(); }} maxLength="40000" /></Field><Button className="section-action" type="button" secondary disabled={source.trim().length < 10 || Boolean(busy) || !bootstrap.ai_available} onClick={() => extract('text')}>{busy === 'text' ? 'Reading…' : 'Import text'}</Button></>}
    </details>
    <div className="ai-availability"><p className="small-note">{bootstrap.ai_available ? 'AI prepares screening and convenience from your description.' : 'Live AI is unavailable. Use the fixed example to try publication.'}</p><button type="button" className="text-button" disabled={Boolean(busy)} onClick={() => extract('sample')}>{busy === 'sample' ? 'Loading…' : 'Use fixed example'}<ArrowUpRight size={13} /></button></div>
    <ErrorMessage message={error} />
    <form onSubmit={prepare}><fieldset className="study-facts-fieldset" disabled={Boolean(busy)}><section className="form-section"><div className="form-grid">
      <Field label="Study title" wide><input value={study.title} onChange={(event) => change('title', event.target.value)} required maxLength="120" placeholder="How we make everyday decisions" /></Field>
      <Field label="Description & eligibility" wide hint="Describe the task and everyone who can or cannot take part."><textarea rows="6" value={study.description} onChange={(event) => change('description', event.target.value)} required minLength="10" maxLength="12000" placeholder="Participants complete a decision-making task. Open to adults aged 18–35 who speak English fluently and have a laptop…" /></Field>
      <Field label="Format"><select value={study.mode} onChange={(event) => { setStudy((current) => ({ ...current, mode: event.target.value, location: event.target.value === 'online' ? 'Online' : '' })); invalidateDraft(); }}><option value="online">Online</option><option value="in_person">In person</option></select></Field>
      {study.mode === 'in_person' && <ChoiceField label="Location" value={study.location} options={bootstrap.locations} onChange={(value) => change('location', value)} />}
      <Field label="Duration (minutes)"><input type="number" min="5" max="480" required value={study.duration} onChange={(event) => change('duration', Number(event.target.value))} /></Field>
      <Field label="Compensation (£)"><input type="number" min="0" max="10000" step="0.01" required value={study.compensation} onChange={(event) => change('compensation', Number(event.target.value))} /></Field>
    </div><fieldset className="plain-fieldset"><legend>Study topics <span>(choose at least one)</span></legend><TagPicker topics={bootstrap.topics} selected={study.tags} onChange={(tags) => change('tags', tags)} /></fieldset>{!draft && <Button className="section-action" disabled={!bootstrap.ai_available}>{busy === 'prepare' ? 'Preparing…' : 'Prepare preview'}</Button>}</section></fieldset></form>
    {draft && <form onSubmit={publish}>
      <section className="form-section study-preview"><div className="section-title"><h2>Review preview</h2><span className="tag">{draft.mode === 'sample' ? 'Fixed example · no AI call' : 'AI prepared'}</span></div><h3>{draft.fields.title}</h3><p>{draft.fields.summary}</p><p className="preserve-lines">{draft.fields.description}</p><h3>Who can take part</h3><p className="preserve-lines">{draft.fields.requirements}</p>{draft.manual_review && <p className="review-decision">Participants need researcher review before booking.</p>}{draft.review_notes.length > 0 && <details className="preview-notes"><summary>Review notes ({draft.review_notes.length})</summary><ul>{draft.review_notes.map((note, index) => <li key={index}>{note}</li>)}</ul></details>}<p className="small-note">To correct this preview, edit the description above and prepare it again.</p></section>
      <details className="source-document"><summary>Original source text</summary><p className="preserve-lines">{draft.source_text}</p></details>
      <section className="form-section"><h2>Sessions</h2><SlotsEditor slots={slots} onChange={setSlots} /></section>
      <div className="publish-section"><label className="check"><input type="checkbox" checked={approved} onChange={(event) => setApproved(event.target.checked)} required /><span>I reviewed the study details and eligibility, and approve this synthetic study.</span></label><Button disabled={Boolean(busy) || !approved}>{busy === 'publish' ? 'Publishing…' : 'Publish study'}<CheckCircle2 size={16} /></Button></div>
    </form>}
  </div>;
}

function PublishedStudy({ study, onBack, onAddSlots }) {
  const [adding, setAdding] = useState(false);
  const [slots, setSlots] = useState([{ starts_at: nextSession(), capacity: 3 }]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function save(event) {
    event.preventDefault(); setBusy(true); setError('');
    try { await onAddSlots(study.id, slotPayload(slots)); setAdding(false); setSlots([{ starts_at: nextSession(), capacity: 3 }]); }
    catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }
  return <div className="page detail-page"><Back onClick={onBack}>Back to my studies</Back><Heading title={study.title} description={study.summary} /><div className="detail-facts"><span><strong>{money(study.compensation)}</strong>compensation</span><span><strong>{study.duration} min</strong>duration</span><span><strong>{study.booked_count}</strong>bookings</span><span><strong>{formatLabel(study.mode)}</strong>{study.location}</span></div><section className="detail-section"><h2>Description</h2><p className="preserve-lines">{study.description}</p>{study.manual_review && <p>Researcher review required before booking. Manage requests in Review requests.</p>}</section><section className="detail-section"><div className="section-title"><h2>Sessions</h2><Button secondary onClick={() => setAdding(!adding)}>{adding ? 'Cancel' : 'Add sessions'}{!adding && <Plus size={15} />}</Button></div>{study.slots.length ? <div className="simple-table">{study.slots.map((slot) => <div className="simple-row" key={slot.id}><span>{dateLabel(slot.starts_at)} · {timeLabel(slot.starts_at)}</span><span>{slot.remaining} / {slot.capacity} places left</span></div>)}</div> : <p>No sessions listed.</p>}{adding && <form className="add-sessions" onSubmit={save}><SlotsEditor slots={slots} onChange={setSlots} /><ErrorMessage message={error} /><div className="section-action"><Button disabled={busy || slots.length === 0}>{busy ? 'Saving…' : 'Save sessions'}</Button></div></form>}</section></div>;
}

function ReviewRequest({ request, onDecision }) {
  const [note, setNote] = useState('');
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function decide(decision) {
    setBusy(true); setError('');
    try { await onDecision(request.id, { decision, note, eligibility_checked: checked }); }
    catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }
  return <section className="review-request"><div className="section-title"><div><h2>{request.participant_name}</h2><p>{request.title}</p></div><span className={`status ${request.status === 'approved' ? 'success' : request.status === 'pending' ? 'pending' : ''}`}>{request.status}</span></div>{request.note && <p className="review-message">{request.note}</p>}{request.status === 'pending' ? <><Field label="Decision note" hint="Visible to the participant. Keep sensitive details outside this demo."><textarea rows="2" value={note} maxLength="1000" onChange={(event) => setNote(event.target.value)} /></Field><label className="check review-check"><input type="checkbox" checked={checked} onChange={(event) => setChecked(event.target.checked)} />I completed the necessary eligibility and safety checks outside this demo.</label><ErrorMessage message={error} /><div className="review-actions"><Button disabled={busy || !checked} onClick={() => decide('approved')}>{busy ? 'Saving…' : 'Approve request'}</Button><Button secondary disabled={busy} onClick={() => decide('declined')}>Decline</Button></div></> : request.decision_note && <p className="review-message">{request.decision_note}</p>}</section>;
}

export default function Researcher({ account, bootstrap, onLogout }) {
  const [data, setData] = useState({ studies: [], bookings: [], review_requests: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [view, setView] = useState('studies');
  const [selected, setSelected] = useState(null);
  const [notice, setNotice] = useState('');
  async function load() { setLoading(true); setError(''); try { setData(await api('/researcher/studies')); } catch (failure) { setError(failure.message); } finally { setLoading(false); } }
  useEffect(() => { load(); }, []);
  function navigate(next) { setView(next); setSelected(null); window.scrollTo({ top: 0 }); }
  async function publish(payload) { const study = await api('/studies', 'POST', payload); setData(await api('/researcher/studies')); setView('studies'); setSelected(study.id); setNotice('Study published.'); window.scrollTo({ top: 0 }); }
  async function addSlots(studyId, slots) { await api(`/researcher/studies/${studyId}/slots`, 'POST', { slots }); setData(await api('/researcher/studies')); setNotice('Sessions added.'); }
  async function decision(requestId, payload) { await api(`/review-requests/${requestId}/decision`, 'POST', payload); setData(await api('/researcher/studies')); setNotice('Review decision saved.'); }
  const study = data.studies.find((item) => item.id === selected);
  return <Shell account={account} view={view === 'create' ? 'studies' : view} setView={navigate} onLogout={onLogout}><Notice onClose={() => setNotice('')}>{notice}</Notice>{loading ? <Loading /> : view === 'create' ? <CreateStudy bootstrap={bootstrap} onBack={() => navigate('studies')} onPublish={publish} /> : study ? <PublishedStudy key={study.id} study={study} onBack={() => setSelected(null)} onAddSlots={addSlots} /> : <div className="page"><Heading title={view === 'bookings' ? 'Bookings' : view === 'reviews' ? 'Review requests' : 'My studies'}>{view === 'studies' && <Button onClick={() => navigate('create')}><Plus size={16} />Create study</Button>}</Heading><ErrorMessage message={error} />{error && <Button secondary onClick={load}>Try again</Button>}
    {view === 'reviews' ? <div className="review-queue">{data.review_requests.length ? data.review_requests.map((request) => <ReviewRequest key={request.id} request={request} onDecision={decision} />) : <Empty icon={ClipboardCheck} title="No review requests">Participants can request review from a study’s details.</Empty>}</div> : view === 'bookings' ? data.bookings.length ? <div className="research-table bookings-table"><div className="table-head"><span>Participant & study</span><span>Session</span><span>Status</span></div>{data.bookings.map((booking) => <div className="research-row" key={booking.id}><div><strong>{booking.participant_name}</strong><span>{booking.title}</span></div><div><strong>{dateLabel(booking.starts_at)}</strong><span>{timeLabel(booking.starts_at)} · Europe/London</span></div><span className="status success"><CheckCircle2 size={14} />Confirmed</span></div>)}</div> : <Empty icon={CalendarDays} title="No bookings yet">Confirmed sessions appear here.</Empty> : <><div className="research-toolbar"><span>{data.studies.length} published {data.studies.length === 1 ? 'study' : 'studies'}</span><span>{data.bookings.length} bookings</span></div>{data.studies.length ? <div className="research-table"><div className="table-head"><span>Study</span><span>Availability</span><span>Bookings</span><span /></div>{data.studies.map((item) => { const openSessions = item.slots.filter((slot) => slot.remaining > 0 && new Date(slot.starts_at) > new Date()).length; return <button className="research-row" key={item.id} onClick={() => { setSelected(item.id); window.scrollTo({ top: 0 }); }}><div><strong>{item.title}</strong><span>{money(item.compensation)} · {item.duration} min · {formatLabel(item.mode)}</span></div><div><span className={`status ${item.manual_review ? '' : 'success'}`}><span className="status-dot" />{item.manual_review ? 'Researcher review' : `${openSessions} open session${openSessions === 1 ? '' : 's'}`}</span></div><strong className="booking-count">{item.booked_count}</strong><ChevronRight size={16} /></button>; })}</div> : <Empty icon={FlaskConical} title="Publish your first study" action={<Button secondary onClick={() => navigate('create')}><Plus size={15} />Create study</Button>}>Describe the study or import a PDF, then review the AI preview.</Empty>}</>}
  </div>}</Shell>;
}
