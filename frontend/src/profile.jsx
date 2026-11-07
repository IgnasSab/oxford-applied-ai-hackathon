import { useState } from 'react';
import { Check } from 'lucide-react';
import { BooleanField, Button, ErrorMessage, Field, Heading, NextIcon, TagPicker, Weights } from './components';

const newProfile = (name) => ({ name, birth_date: '', handedness: '', first_language: '', additional_languages: [], english: null, vision: null, psychology_background: null, university: '', has_laptop: null, has_smartphone: null, has_headphones: null, comfortable_webcam: null, comfortable_audio_recording: null, comfortable_video_recording: null, free_response: '', interests: [], preferred_mode: 'any', preferred_location: '', max_duration: 480, preferred_times: [], notifications: 'off', weights: { interest: 3, compensation: 3, convenience: 3 } });

function ChoiceField({ label, value, options, onChange }) {
  const [custom, setCustom] = useState(Boolean(value && !options.includes(value)));
  return <div className="choice-field"><Field label={label}><select value={custom ? '__other' : value} required onChange={(event) => { setCustom(event.target.value === '__other'); onChange(event.target.value === '__other' ? '' : event.target.value); }}><option value="">Choose an answer</option>{options.map((option) => <option key={option}>{option}</option>)}<option value="__other">Other</option></select></Field>{custom && <Field label={`Other ${label.toLowerCase()}`}><input value={value} required maxLength="150" onChange={(event) => onChange(event.target.value)} /></Field>}</div>;
}

export default function ProfileForm({ profile, account, bootstrap, onSave, onCancel }) {
  const [draft, setDraft] = useState(profile || newProfile(account.name));
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [additionalLanguage, setAdditionalLanguage] = useState('');
  const update = (key, value) => setDraft((current) => ({ ...current, [key]: value }));
  const languageOptions = [...new Set([...bootstrap.languages, ...draft.additional_languages])];
  function addLanguage() {
    const language = additionalLanguage.trim();
    if (language && !draft.additional_languages.includes(language)) update('additional_languages', [...draft.additional_languages, language]);
    setAdditionalLanguage('');
  }
  async function submit(event) {
    event.preventDefault();
    if (step === 1) { setStep(2); window.scrollTo({ top: 0 }); return; }
    setBusy(true); setError('');
    try { await onSave(draft); }
    catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }
  return <div className="page form-page">
    <Heading title={account.onboarded ? 'Profile & preferences' : 'Complete your profile'} description="Use fictional details in this demo." />
    <div className="stepper" aria-label={`Step ${step} of 2`}><span className={step === 1 ? 'current' : 'complete'}><span>{step > 1 ? <Check size={13} /> : '1'}</span>About you</span><div /><span className={step === 2 ? 'current' : ''}><span>2</span>Preferences</span></div>
    <form onSubmit={submit}><ErrorMessage message={error} />
      {step === 1 ? <>
        <section className="form-section"><h2>About you</h2><div className="form-grid">
          <Field label="Display name"><input value={draft.name} onChange={(event) => update('name', event.target.value)} required maxLength="80" autoComplete="name" /></Field>
          <Field label="Birth date" hint="This demo is for adults aged 18–120."><input type="date" value={draft.birth_date === null ? '' : draft.birth_date} onChange={(event) => update('birth_date', event.target.value)} required autoComplete="bday" /></Field>
          <Field label="Handedness"><select value={draft.handedness} onChange={(event) => update('handedness', event.target.value)} required><option value="">Choose an answer</option><option value="right">Right-handed</option><option value="left">Left-handed</option><option value="ambidextrous">Ambidextrous</option></select></Field>
          <ChoiceField label="First language" value={draft.first_language} options={bootstrap.languages} onChange={(value) => update('first_language', value)} />
          <ChoiceField label="University affiliation" value={draft.university} options={bootstrap.universities} onChange={(value) => update('university', value)} />
          <BooleanField label="Are you fluent in English?" value={draft.english} onChange={(value) => update('english', value)} />
          <BooleanField label="Do you have normal or corrected-to-normal vision?" value={draft.vision} onChange={(value) => update('vision', value)} />
          <BooleanField label="Have you studied psychology academically?" value={draft.psychology_background} onChange={(value) => update('psychology_background', value)} />
        </div><fieldset className="plain-fieldset"><legend>Additional languages you speak fluently <span>(optional)</span></legend><TagPicker topics={languageOptions} selected={draft.additional_languages} onChange={(value) => update('additional_languages', value)} /></fieldset>
          <div className="section-action"><Field label="Another fluent language"><input placeholder="e.g. Lithuanian" maxLength="80" value={additionalLanguage} onChange={(event) => setAdditionalLanguage(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addLanguage(); } }} /></Field><Button type="button" secondary className="section-action" disabled={!additionalLanguage.trim()} onClick={addLanguage}>Add language</Button></div>
        </section>
        <section className="form-section"><h2>Equipment & participation</h2><p>Recording preferences are willingness to take part, not consent to a study.</p><div className="form-grid">
          {[
            ['has_laptop', 'Can you use a laptop or desktop computer?'],
            ['has_smartphone', 'Can you use a smartphone?'],
            ['has_headphones', 'Can you use headphones?'],
            ['comfortable_webcam', 'Are you willing to use a webcam during a session?'],
            ['comfortable_audio_recording', 'Are you willing to have your voice recorded?'],
            ['comfortable_video_recording', 'Are you willing to be recorded on video?'],
          ].map(([key, label]) => <BooleanField key={key} label={label} value={draft[key]} onChange={(value) => update(key, value)} />)}
        </div></section>
        <section className="form-section"><Field label="What would you enjoy taking part in?" hint="Optional. This note doesn’t determine eligibility."><textarea rows="3" value={draft.free_response} onChange={(event) => update('free_response', event.target.value)} maxLength="1000" placeholder="I enjoy strategy games and learning how people make decisions…" /></Field></section>
      </> : <>
        <section className="form-section"><h2>Interests</h2><TagPicker topics={bootstrap.topics} selected={draft.interests} onChange={(value) => update('interests', value)} /></section>
        <section className="form-section"><h2>Preferences</h2><p>These affect browsing and ranking, not scientific eligibility.</p><div className="form-grid">
          <Field label="Preferred format"><select value={draft.preferred_mode} onChange={(event) => update('preferred_mode', event.target.value)}><option value="any">Online or in person</option><option value="online">Online</option><option value="in_person">In person</option></select></Field>
          <Field label="Maximum duration"><select value={draft.max_duration} onChange={(event) => update('max_duration', Number(event.target.value))}>{[15,30,45,60,90,120,240,480].map((value) => <option key={value} value={value}>{value === 480 ? 'No preference' : `${value} minutes`}</option>)}</select></Field>
          <Field label="Preferred location" hint="Used when you enable preference filters."><input value={draft.preferred_location} onChange={(event) => update('preferred_location', event.target.value)} placeholder="e.g. Oxford" maxLength="150" /></Field>
          <Field label="Demo alerts" hint="In-app simulation; no email is sent."><select value={draft.notifications} onChange={(event) => update('notifications', event.target.value)}><option value="off">Off</option><option value="immediate">When a match is available</option><option value="weekly">Weekly summary</option></select></Field>
        </div><fieldset className="plain-fieldset"><legend>Preferred times <span>(optional)</span></legend><div className="check-row">{['morning','afternoon','evening'].map((time) => <label className="check" key={time}><input type="checkbox" checked={draft.preferred_times.includes(time)} onChange={() => update('preferred_times', draft.preferred_times.includes(time) ? draft.preferred_times.filter((item) => item !== time) : [...draft.preferred_times, time])} /><span className="capitalize">{time}</span></label>)}</div></fieldset></section>
        <section className="form-section"><h2>Priorities</h2><Weights weights={draft.weights} onChange={(value) => update('weights', value)} /></section>
      </>}
      <div className="form-actions"><div>{step === 2 ? <Button type="button" secondary onClick={() => { setStep(1); setError(''); }}>Back</Button> : onCancel && <Button type="button" secondary onClick={onCancel}>Cancel</Button>}</div><Button disabled={busy}>{busy ? 'Saving…' : step === 1 ? 'Continue' : account.onboarded ? 'Save changes' : 'Find my studies'}{!busy && <NextIcon />}</Button></div>
    </form>
  </div>;
}
