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
      if (tab === 'preferences' && profile) await onSavePreferences(Object.fromEntries(preferenceFields.map((key) => [key, draft[key]])));
      else await onSave(profile ? { ...draft, ...Object.fromEntries(preferenceFields.map((key) => [key, profile[key]])) } : draft);
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }
  const optionalQuestions = (fields) => <div className="form-grid">{fields.map(({ field, label, type, options }) => type === 'boolean' ? <BooleanField key={field} label={label} required={false} value={draft[field]} onChange={(value) => update(field, value)} /> : <Field key={field} label={label}><select value={draft[field] === null ? '' : draft[field]} onChange={(event) => update(field, event.target.value || null)}><option value="">Prefer not to answer</option>{options.map((option) => <option key={option}>{option}</option>)}</select></Field>)}</div>;
  return <div className="page form-page">
    <Heading title={account.onboarded ? 'Profile & preferences' : 'Complete your profile'} description="Use fictional details in this demo." />
    <div className="profile-tabs" role="tablist" aria-label="Profile settings">{[['preferences', 'Preferences'], ['prescreen', 'Prescreen questionnaire']].map(([key, label]) => <button key={key} type="button" role="tab" id={`tab-${key}`} aria-selected={tab === key} aria-controls="profile-panel" className={tab === key ? 'active' : ''} onClick={() => { setTab(key); setError(''); }}>{label}</button>)}</div>
    <form onSubmit={submit} id="profile-panel" role="tabpanel" aria-labelledby={`tab-${tab}`}><ErrorMessage message={error} />
      {tab === 'prescreen' ? <>
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
        {bootstrap.prescreen_sections.map((section, index) => index === 0 ? <section className="form-section" key={section.title}><h2>{section.title}</h2><p>Optional. Unanswered questions can be asked when you join a study.</p>{optionalQuestions(section.fields)}</section> : <details className="form-section prescreen-section" key={section.title}><summary>{section.title}<span>{section.fields.length} optional questions</span></summary><p>Fictional answers only. These answers never provide medical clearance; relevant studies still need researcher review.</p>{optionalQuestions(section.fields)}</details>)}
        <section className="form-section"><Field label="What would you enjoy taking part in?" hint="Optional. This note doesn’t determine eligibility."><textarea rows="3" value={draft.free_response} onChange={(event) => update('free_response', event.target.value)} maxLength="1000" placeholder="I enjoy strategy games and learning how people make decisions…" /></Field></section>
      </> : <>
        <section className="form-section"><h2>Interests</h2><TagPicker topics={bootstrap.topics} selected={draft.interests} onChange={(value) => update('interests', value)} /></section>
        <section className="form-section"><h2>Preferences</h2><p>These affect browsing and ranking, not scientific eligibility.</p><div className="form-grid">
          <Field label="Preferred format"><select value={draft.preferred_mode} onChange={(event) => update('preferred_mode', event.target.value)}><option value="any">Online or in person</option><option value="online">Online</option><option value="in_person">In person</option></select></Field>
          <Field label="Maximum duration"><select value={draft.max_duration} onChange={(event) => update('max_duration', Number(event.target.value))}>{[15,30,45,60,90,120,240,480].map((value) => <option key={value} value={value}>{value === 480 ? 'No preference' : `${value} minutes`}</option>)}</select></Field>
          <Field label="Preferred location" hint="Used when you enable preference filters."><input value={draft.preferred_location} onChange={(event) => update('preferred_location', event.target.value)} placeholder="e.g. Oxford" maxLength="150" /></Field>
          <Field label="Match notifications" hint="In-app simulation; no email is sent."><select value={draft.notifications} onChange={(event) => update('notifications', event.target.value)}><option value="off">Off</option><option value="immediate">When a match is available</option><option value="weekly">Weekly summary</option></select></Field>
        </div><fieldset className="plain-fieldset"><legend>Preferred times <span>(optional)</span></legend><div className="check-row">{['morning','afternoon','evening'].map((time) => <label className="check" key={time}><input type="checkbox" checked={draft.preferred_times.includes(time)} onChange={() => update('preferred_times', draft.preferred_times.includes(time) ? draft.preferred_times.filter((item) => item !== time) : [...draft.preferred_times, time])} /><span className="capitalize">{time}</span></label>)}</div></fieldset><label className="check preference-filter-toggle"><input type="checkbox" checked={draft.preference_filters} onChange={(event) => update('preference_filters', event.target.checked)} /><span>Only show studies that fit my format, duration, location and preferred times</span></label></section>
        <section className="form-section"><h2>Priorities</h2><p>Higher priorities have more influence on your match order.</p><Weights weights={draft.weights} onChange={(value) => update('weights', value)} /></section>
      </>}
      <div className="form-actions"><div>{onCancel && <Button type="button" secondary onClick={onCancel}>Back to studies</Button>}</div><Button disabled={busy || (tab === 'preferences' && !profile)}>{busy ? 'Saving…' : tab === 'preferences' ? 'Save preferences' : 'Save questionnaire'}</Button></div>{tab === 'preferences' && !profile && <p className="save-hint">Complete and save your prescreen questionnaire first. Your preference choices stay here.</p>}
    </form>
  </div>;
}
