import { useState } from 'react';
import { X } from 'lucide-react';
import { BooleanField, Button, ChoiceField, ErrorMessage, Field, Heading, TagPicker, Weights } from './components';

const preferenceFields = ['interests', 'preferred_mode', 'preferred_location', 'max_duration', 'preferred_times', 'notifications', 'weights', 'preference_filters'];
const newProfile = (name, sections) => ({ name, birth_date: '', handedness: '', first_language: '', additional_languages: [], language_levels: {}, english: null, vision: null, psychology_background: null, university: '', has_laptop: null, has_smartphone: null, has_headphones: null, comfortable_webcam: null, comfortable_audio_recording: null, comfortable_video_recording: null, free_response: '', interests: [], preferred_mode: 'any', preferred_location: '', max_duration: 480, preferred_times: [], notifications: 'off', weights: { interest: 3, compensation: 3, convenience: 3 }, preference_filters: false, ...Object.fromEntries(sections.flatMap((section) => section.fields.map(({ field }) => [field, null]))) });

export default function ProfileForm({ profile, account, bootstrap, onSave, onSavePreferences, onCancel }) {
  const [draft, setDraft] = useState(profile || newProfile(account.name, bootstrap.prescreen_sections));
  const [tab, setTab] = useState(account.onboarded ? 'preferences' : 'prescreen');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [additionalLanguage, setAdditionalLanguage] = useState('');
  const [languageLevel, setLanguageLevel] = useState('');
  const update = (key, value) => setDraft((current) => ({ ...current, [key]: value }));
  function changeLanguage(language, level) {
    const levels = { ...draft.language_levels };
    if (level === null) delete levels[language];
    else levels[language] = level;
    setDraft((current) => ({ ...current, language_levels: levels, additional_languages: Object.keys(levels).filter((key) => levels[key] === 'Fluent') }));
  }
  function addLanguage() {
    changeLanguage(additionalLanguage.trim(), languageLevel);
    setAdditionalLanguage(''); setLanguageLevel('');
  }
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      if (account.onboarded && tab === 'preferences') await onSavePreferences({ interests: draft.interests, weights: draft.weights });
      else await onSave(account.onboarded ? { ...draft, ...Object.fromEntries(preferenceFields.map((key) => [key, profile[key]])) } : draft);
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }
  const optionalQuestions = (fields) => <div className="form-grid">{fields.map(({ field, label, type, options }) => type === 'boolean' ? <BooleanField key={field} label={label} required={false} value={draft[field]} onChange={(value) => update(field, value)} /> : <Field key={field} label={label}><select value={draft[field] === null ? '' : draft[field]} onChange={(event) => update(field, event.target.value || null)}><option value="">Prefer not to answer</option>{options.map((option) => <option key={option}>{option}</option>)}</select></Field>)}</div>;
  return <div className="page form-page">
    <Heading title={account.onboarded ? 'Profile & preferences' : 'Complete your profile'} description="Use fictional details in this demo." />
    {account.onboarded && <div className="profile-tabs" role="tablist" aria-label="Profile settings">{[['preferences', 'Preferences'], ['prescreen', 'Prescreen questionnaire']].map(([key, label]) => <button key={key} type="button" role="tab" id={`tab-${key}`} aria-selected={tab === key} aria-controls="profile-panel" className={tab === key ? 'active' : ''} onClick={() => { setTab(key); setError(''); }}>{label}</button>)}</div>}
    <form onSubmit={submit} id="profile-panel" role={account.onboarded ? 'tabpanel' : undefined} aria-labelledby={account.onboarded ? `tab-${tab}` : undefined}><ErrorMessage message={error} />
      {(!account.onboarded || tab === 'prescreen') && <>
        <section className="form-section"><h2>About you</h2><div className="form-grid">
          <Field label="Display name"><input value={draft.name} onChange={(event) => update('name', event.target.value)} required maxLength="80" autoComplete="name" /></Field>
          <Field label="Birth date" hint="This demo is for adults aged 18–120."><input type="date" value={draft.birth_date === null ? '' : draft.birth_date} onChange={(event) => update('birth_date', event.target.value)} required autoComplete="bday" /></Field>
          <Field label="Handedness"><select value={draft.handedness} onChange={(event) => update('handedness', event.target.value)} required><option value="">Choose an answer</option><option value="right">Right-handed</option><option value="left">Left-handed</option><option value="ambidextrous">Ambidextrous</option></select></Field>
          <ChoiceField label="First language" value={draft.first_language} options={bootstrap.languages} onChange={(value) => update('first_language', value)} />
          <ChoiceField label="University affiliation" value={draft.university} options={bootstrap.universities} onChange={(value) => update('university', value)} />
          <BooleanField label="Are you fluent in English?" value={draft.english} onChange={(value) => update('english', value)} />
          <BooleanField label="Do you have normal or corrected-to-normal vision?" value={draft.vision} onChange={(value) => update('vision', value)} />
          <BooleanField label="Have you studied psychology academically?" value={draft.psychology_background} onChange={(value) => update('psychology_background', value)} />
        </div></section>
        <section className="form-section"><h2>Additional languages</h2><p>Optional. Select your level for each language.</p><div className="language-list">{Object.entries(draft.language_levels).map(([language, level]) => <div className="language-row" key={language}><strong>{language}</strong><select aria-label={`${language} proficiency`} value={level} onChange={(event) => changeLanguage(language, event.target.value)}>{bootstrap.language_levels.map((option) => <option key={option}>{option}</option>)}</select><button type="button" className="icon-button" aria-label={`Remove ${language}`} onClick={() => changeLanguage(language, null)}><X size={16} /></button></div>)}</div><div className="language-add"><ChoiceField label="Language" required={false} value={additionalLanguage} options={bootstrap.languages} onChange={setAdditionalLanguage} /><Field label="Proficiency"><select value={languageLevel} onChange={(event) => setLanguageLevel(event.target.value)}><option value="">Choose a level</option>{bootstrap.language_levels.map((level) => <option key={level}>{level}</option>)}</select></Field><Button type="button" secondary disabled={!additionalLanguage.trim() || !languageLevel} onClick={addLanguage}>Add language</Button></div></section>
        <section className="form-section"><h2>Equipment & participation</h2><p>Recording preferences are willingness to take part, not consent to a study.</p><div className="form-grid">{[
          ['has_laptop', 'Can you use a laptop or desktop computer?'],
          ['has_smartphone', 'Can you use a smartphone?'],
          ['has_headphones', 'Can you use headphones?'],
          ['comfortable_webcam', 'Are you willing to use a webcam during a session?'],
          ['comfortable_audio_recording', 'Are you willing to have your voice recorded?'],
          ['comfortable_video_recording', 'Are you willing to be recorded on video?'],
        ].map(([key, label]) => <BooleanField key={key} label={label} value={draft[key]} onChange={(value) => update(key, value)} />)}</div></section>
        {bootstrap.prescreen_sections.slice(0, 1).map((section) => <section className="form-section" key={section.title}><h2>{section.title}</h2><p>Optional. Unanswered questions can be asked when you join a study.</p>{optionalQuestions(section.fields)}</section>)}
        <section className="form-section"><Field label="What would you enjoy taking part in?" hint="Optional. This note doesn’t determine eligibility."><textarea rows="3" value={draft.free_response} onChange={(event) => update('free_response', event.target.value)} maxLength="1000" placeholder="I enjoy strategy games and learning how people make decisions…" /></Field></section>
      </>}
      {(!account.onboarded || tab === 'preferences') && <>
        <section className="form-section"><h2>Interests</h2><TagPicker topics={bootstrap.topics} selected={draft.interests} onChange={(value) => update('interests', value)} /></section>
        <section className="form-section"><h2>Priorities</h2><p>Higher priorities have more influence on your match order.</p><Weights weights={draft.weights} onChange={(value) => update('weights', value)} /></section>
      </>}
      <div className="form-actions"><div>{onCancel && <Button type="button" secondary onClick={onCancel}>Back to studies</Button>}</div><Button disabled={busy}>{busy ? 'Saving…' : !account.onboarded ? 'Find studies' : tab === 'preferences' ? 'Save preferences' : 'Save questionnaire'}</Button></div>
    </form>
  </div>;
}
