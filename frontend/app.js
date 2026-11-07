const app = document.querySelector('#app');
const dialog = document.querySelector('#dialog');
const dialogContent = document.querySelector('#dialog-content');
const state = { role: 'participant', view: 'feed', filter: 'all', participantId: null, bootstrap: null, participantData: null, researcherData: null, draft: null, weekOffset: 0 };
const money = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 });
const dateLabel = (value) => new Date(value).toLocaleDateString('en-GB', { timeZone: 'Europe/London', weekday: 'short', day: 'numeric', month: 'short' });
const timeLabel = (value) => new Date(value).toLocaleTimeString('en-GB', { timeZone: 'Europe/London', hour: '2-digit', minute: '2-digit' });
const escape = (value) => String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
const sameId = (left, right) => String(left) === String(right);
const participant = () => state.bootstrap.participants.find((item) => sameId(item.id, state.participantId));
let noticeTimer;

async function api(path, method = 'GET', body) {
  const response = await fetch(`/api${path}`, { method, headers: { 'Content-Type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const data = await response.json();
  if (!response.ok) {
    const message = Array.isArray(data.detail) ? data.detail.map((item) => `${item.loc.slice(1).join(' ')}: ${item.msg}`).join('; ') : data.detail;
    throw new Error(message || 'The request could not be completed. Please try again.');
  }
  return data;
}

function notify(message, error = false) {
  const notice = document.querySelector('#notice');
  notice.textContent = message;
  notice.className = error ? 'error' : '';
  notice.hidden = false;
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => { notice.hidden = true; }, error ? 10000 : 5500);
}

async function busy(button, action) {
  const original = button.textContent;
  button.disabled = true;
  button.textContent = 'Working…';
  try { await action(); }
  catch (error) { notify(error.message, true); }
  finally { button.disabled = false; button.textContent = original; }
}

function openDialog(content) {
  dialogContent.innerHTML = content;
  dialog.showModal();
}

document.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });
document.querySelectorAll('[data-role]').forEach((button) => button.addEventListener('click', async () => {
  state.role = button.dataset.role;
  document.querySelectorAll('[data-role]').forEach((item) => {
    const selected = item === button;
    item.classList.toggle('active', selected);
    item.setAttribute('aria-pressed', String(selected));
  });
  await loadWorkspace();
}));

async function loadWorkspace() {
  app.setAttribute('aria-busy', 'true');
  try {
    if (state.role === 'participant') {
      state.participantData = await api(`/participants/${state.participantId}/matches`);
      renderParticipant();
    } else {
      state.researcherData = await api('/researcher/studies');
      state.draft = null;
      renderResearcher();
    }
  } catch (error) { notify(error.message, true); }
  finally { app.setAttribute('aria-busy', 'false'); }
}

function studyCard(study) {
  const eligible = study.status === 'eligible';
  const screening = study.status === 'needs_screening';
  const badge = study.booked ? 'Booked' : eligible ? 'Eligible' : screening ? 'One step away' : 'Review required';
  const places = study.slots.reduce((total, slot) => total + slot.remaining, 0);
  return `<article class="study-card" id="study-${escape(study.id)}">
    <div class="card-top"><span class="topic">${escape(study.topic)}</span><span class="badge ${eligible ? '' : screening ? 'amber' : 'neutral'}">${badge}</span></div>
    <div class="card-body"><h3>${escape(study.title)}</h3><p class="description">${escape(study.description)}</p>
      <div class="facts"><span><strong>${money.format(study.compensation)}</strong><span class="fact-place">compensation</span></span><span>${study.duration} min<span class="fact-place">${study.mode === 'online' ? 'Online' : 'In person'}</span></span></div>
      <div class="match-reason"><span aria-hidden="true">${eligible ? '↗' : '○'}</span><span>${eligible ? escape(study.reasons.join(' · ')) : screening ? `${study.questions.length} unanswered question${study.questions.length === 1 ? '' : 's'} before booking` : 'An investigator must review this study before booking.'}</span></div>
    </div>
    <div class="card-bottom"><span>${eligible ? `${Math.round(study.score)} / 100 relevance` : 'Eligibility comes first'}</span>
      ${study.booked ? '<span class="badge">You’re booked ✓</span>' : eligible ? `<button class="button small" data-book="${escape(study.id)}" ${places === 0 ? 'disabled' : ''}>${places === 0 ? 'Full' : 'View times ↗'}</button>` : screening ? `<button class="button small secondary" data-screen="${escape(study.id)}">Check eligibility →</button>` : '<span>Not bookable</span>'}
    </div>
  </article>`;
}

function renderParticipant() {
  const profile = participant();
  const { matches, bookings, notifications } = state.participantData;
  const eligible = matches.filter((study) => study.status === 'eligible');
  const pending = matches.filter((study) => study.status !== 'eligible');
  const filtered = eligible.filter((study) => state.filter === 'all' || study.mode === state.filter);
  const weightTotal = Object.values(profile.weights).reduce((total, value) => total + value, 0);
  app.innerHTML = `<section class="hero"><div><p class="eyebrow">For the curious</p><h1>Good research.<br><em>Your kind of studies.</em></h1><p>Find your fit, answer less, and take part.</p></div>
    <div class="profile-picker"><label for="participant-picker">Demo participant</label><select id="participant-picker">${state.bootstrap.participants.map((item) => `<option value="${escape(item.id)}" ${sameId(item.id, profile.id) ? 'selected' : ''}>${escape(item.name)}</option>`).join('')}</select><div class="profile-actions"><button class="text-button" id="edit-profile">Edit profile</button><button class="text-button" id="new-profile">New participant</button></div></div></section>
    <div class="workspace"><section><div class="section-head"><h2>Picked for you <span class="count">${eligible.length} eligible studies</span></h2><div class="view-switch"><button data-view="feed" class="${state.view === 'feed' ? 'active' : ''}">Discover</button><button data-view="calendar" class="${state.view === 'calendar' ? 'active' : ''}">Weekly calendar</button></div></div>
    <div class="filters" aria-label="Study format">${[['all', 'All formats'], ['online', 'Online'], ['in_person', 'In person']].map(([value, label]) => `<button class="filter ${state.filter === value ? 'active' : ''}" data-filter="${value}" aria-pressed="${state.filter === value}">${label}</button>`).join('')}</div>
    ${state.view === 'feed' ? `<div class="study-grid">${filtered.map(studyCard).join('')}</div>${filtered.length === 0 ? '<div class="empty">No eligible studies in this view.<small>Try another format or complete the screening below.</small></div>' : ''}<p class="small-note">Relevance reflects your preferences, not the probability of eligibility.</p>` : renderCalendar(filtered, bookings)}
    ${pending.length ? `<section class="subsection"><h2>A little more to know</h2><p>Potential matches that need an answer or investigator review.</p><div class="study-grid">${pending.map(studyCard).join('')}</div></section>` : ''}
    </section><aside class="sidebar"><section class="panel preference-panel"><p class="eyebrow">Make it yours</p><h3>What matters<br>to you?</h3><p>Your priorities shape the order.<br>They never change eligibility.</p>${[['interest', 'Your interests'], ['compensation', 'Compensation'], ['convenience', 'Convenience']].map(([key, label]) => `<div class="priority"><div class="priority-line"><span>${label}</span><span>${Math.round(profile.weights[key] / weightTotal * 100)}%</span></div><div class="meter"><span style="width:${profile.weights[key] / weightTotal * 100}%"></span></div></div>`).join('')}<button class="text-button" id="edit-preferences">Adjust preferences →</button></section>
    <section class="panel"><h3>Your next sessions <span class="muted">${bookings.length ? `(${bookings.length})` : ''}</span></h3>${bookings.length ? bookings.map((booking) => `<div class="booking-item"><strong>${escape(booking.title)}</strong><span>${dateLabel(booking.starts_at)} · ${timeLabel(booking.starts_at)}</span><span>${escape(booking.location)} · ${booking.duration} min</span></div>`).join('') : '<p>No bookings yet. Choose a study and find a time that works.</p>'}</section>
    <section class="panel"><h3>Match alerts <span class="badge neutral">Simulated</span></h3>${!profile.notifications ? '<p>Alerts are off. You can enable them in your profile.</p>' : notifications.length ? notifications.map((item) => `<div class="notification-item"><strong>${escape(item.title)}</strong><p>${escape(item.message)}</p><button class="text-button" data-alert="${escape(item.study_id)}">View study →</button></div>`).join('') : '<p>No new high-match alerts right now.</p>'}</section></aside></div>`;
  document.querySelector('#participant-picker').addEventListener('change', async (event) => { state.participantId = event.target.value; await loadWorkspace(); });
  document.querySelector('#edit-profile').addEventListener('click', () => profileDialog(profile));
  document.querySelector('#edit-preferences').addEventListener('click', () => profileDialog(profile));
  document.querySelector('#new-profile').addEventListener('click', () => profileDialog(null));
  document.querySelectorAll('[data-view]').forEach((button) => button.addEventListener('click', () => { state.view = button.dataset.view; renderParticipant(); }));
  document.querySelectorAll('[data-filter]').forEach((button) => button.addEventListener('click', () => { state.filter = button.dataset.filter; renderParticipant(); }));
  document.querySelectorAll('[data-book]').forEach((button) => button.addEventListener('click', () => bookingDialog(matches.find((study) => sameId(study.id, button.dataset.book)), button.dataset.slot)));
  document.querySelectorAll('[data-screen]').forEach((button) => button.addEventListener('click', () => screeningDialog(matches.find((study) => sameId(study.id, button.dataset.screen)))));
  document.querySelectorAll('[data-week]').forEach((button) => button.addEventListener('click', () => { state.weekOffset += Number(button.dataset.week); renderParticipant(); }));
  document.querySelectorAll('[data-alert]').forEach((button) => button.addEventListener('click', () => bookingDialog(matches.find((study) => sameId(study.id, button.dataset.alert)))));
}

function renderCalendar(studies, bookings) {
  const monday = new Date();
  monday.setDate(monday.getDate() - (monday.getDay() + 6) % 7 + state.weekOffset * 7);
  monday.setHours(0, 0, 0, 0);
  const days = Array.from({ length: 7 }, (_, index) => new Date(monday.getTime() + index * 86400000));
  const dateKey = (value) => new Date(value).toLocaleDateString('en-CA', { timeZone: 'Europe/London' });
  return `<div class="calendar-toolbar"><button data-week="-1" aria-label="Previous week">←</button><strong>${dateLabel(days[0])} — ${dateLabel(days[6])}</strong><button data-week="1" aria-label="Next week">→</button></div><div class="calendar-scroll"><div class="calendar">${days.map((day) => `<div class="calendar-day"><div class="day-title">${day.toLocaleDateString('en-GB', { weekday: 'short' })}<strong>${day.getDate()}</strong></div>${bookings.filter((booking) => dateKey(booking.starts_at) === dateKey(day)).map((booking) => `<div class="calendar-slot booked">${timeLabel(booking.starts_at)}<strong>${escape(booking.title)}</strong>Booked ✓</div>`).join('')}${studies.filter((study) => !study.booked).flatMap((study) => study.slots.filter((slot) => slot.remaining > 0 && new Date(slot.starts_at) > new Date() && dateKey(slot.starts_at) === dateKey(day)).map((slot) => `<button class="calendar-slot" data-book="${escape(study.id)}" data-slot="${escape(slot.id)}">${timeLabel(slot.starts_at)}<strong>${escape(study.title)}</strong>${money.format(study.compensation)} · ${study.duration} min</button>`)).join('')}</div>`).join('')}</div></div><p class="small-note">All times Europe/London. Only eligible studies appear here.</p>`;
}

function booleanOptions(value) {
  return [['', 'Not answered'], ['true', 'Yes'], ['false', 'No']].map(([key, label]) => `<option value="${key}" ${(value === null ? '' : String(value)) === key ? 'selected' : ''}>${label}</option>`).join('');
}

function profileDialog(existing) {
  const profile = existing || { name: '', age: 23, english: null, vision: null, interests: ['cognition'], preferred_mode: 'any', max_duration: 60, weights: { interest: 5, compensation: 3, convenience: 2 }, notifications: false };
  openDialog(`<p class="eyebrow">Your reusable profile</p><h2>${existing ? 'A better fit starts here.' : 'Join the demo.'}</h2><p>Use fictional details only. Answer once; we ask again only when a study needs more.</p><form id="profile-form"><div class="form-grid"><label class="field">Display name<input name="name" value="${escape(profile.name)}" required maxlength="80"></label><label class="field">Age<input type="number" name="age" value="${profile.age}" min="18" max="100" required></label><label class="field">Fluent in English?<select name="english">${booleanOptions(profile.english)}</select></label><label class="field">Normal or corrected-to-normal vision?<select name="vision">${booleanOptions(profile.vision)}</select></label></div><h3 class="form-title">What are you curious about?</h3><div class="check-list">${state.bootstrap.topics.map((topic) => `<label class="check"><input type="checkbox" name="interests" value="${escape(topic)}" ${profile.interests.includes(topic) ? 'checked' : ''}>${escape(topic)}</label>`).join('')}</div><hr class="form-divider"><div class="form-grid"><label class="field">Preferred format<select name="preferred_mode">${[['any', 'Either is good'], ['online', 'Online'], ['in_person', 'In person']].map(([value, label]) => `<option value="${value}" ${value === profile.preferred_mode ? 'selected' : ''}>${label}</option>`).join('')}</select></label><label class="field">Preferred maximum duration (minutes)<input type="number" name="max_duration" min="5" max="240" value="${profile.max_duration}" required></label></div><h3 class="form-title">Set your priorities</h3><p class="small-note">Relative weights. A higher weight gives that preference more influence.</p>${[['interest', 'Interests'], ['compensation', 'Compensation'], ['convenience', 'Convenience']].map(([key, label]) => `<label class="field">${label}<input type="range" name="${key}" min="0" max="10" step="0.1" value="${profile.weights[key]}"></label>`).join('')}<label class="check"><input type="checkbox" name="notifications" ${profile.notifications ? 'checked' : ''}>Show simulated alerts for new strong matches</label><div class="form-actions"><button type="button" class="button secondary" id="cancel-profile">Cancel</button><button class="button">${existing ? 'Save preferences' : 'Create demo profile'} →</button></div></form>`);
  document.querySelector('#cancel-profile').addEventListener('click', () => dialog.close());
  document.querySelector('#profile-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = new FormData(event.target);
    const payload = { name: form.get('name'), age: Number(form.get('age')), english: form.get('english') === '' ? null : form.get('english') === 'true', vision: form.get('vision') === '' ? null : form.get('vision') === 'true', interests: form.getAll('interests'), preferred_mode: form.get('preferred_mode'), max_duration: Number(form.get('max_duration')), weights: { interest: Number(form.get('interest')), compensation: Number(form.get('compensation')), convenience: Number(form.get('convenience')) }, notifications: form.has('notifications') };
    await busy(event.submitter, async () => {
      const saved = await api(existing ? `/participants/${existing.id}` : '/participants', existing ? 'PUT' : 'POST', payload);
      if (existing) state.bootstrap.participants = state.bootstrap.participants.map((item) => sameId(item.id, saved.id) ? saved : item);
      else state.bootstrap.participants.push(saved);
      state.participantId = saved.id;
      dialog.close();
      await loadWorkspace();
      notify('Profile saved. Your matches have been refreshed.');
    });
  });
}

function screeningDialog(study) {
  openDialog(`<p class="eyebrow">Only what’s missing</p><h2>${study.questions.length === 1 ? 'Just one more question.' : `${study.questions.length} quick questions.`}</h2><p>${escape(study.title)} needs a little more information before you can book.</p><form id="screening-form">${study.questions.map((question) => `<div class="screen-question"><label for="question-${escape(question.id)}">${escape(question.question)}</label><select id="question-${escape(question.id)}" name="${escape(question.id)}" required><option value="">Choose an answer</option><option value="true">Yes</option><option value="false">No</option></select></div>`).join('')}<p class="small-note">Answer accurately. Your response is evaluated against researcher-approved criteria.</p><div class="form-actions"><button class="button">Check my eligibility →</button></div></form>`);
  document.querySelector('#screening-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const answers = Object.fromEntries([...new FormData(event.target)].map(([key, value]) => [key, value === 'true']));
    await busy(event.submitter, async () => {
      const result = await api(`/participants/${state.participantId}/answers`, 'POST', { study_id: study.id, answers });
      state.bootstrap = await api('/bootstrap');
      dialog.close();
      await loadWorkspace();
      notify(result.status === 'eligible' ? 'You’re eligible. Choose a time to take part.' : result.status === 'ineligible' ? 'This study isn’t a match based on your answers. Your other matches are ready.' : 'Your answers are saved. Further screening or review is needed.');
    });
  });
}

function bookingDialog(study, selectedSlotId) {
  const slots = study.slots.filter((slot) => slot.remaining > 0 && new Date(slot.starts_at) > new Date());
  openDialog(`<p class="eyebrow">Make a little time for discovery</p><h2>${escape(study.title)}</h2><p>${escape(study.description)}</p><div class="facts"><span><strong>${money.format(study.compensation)}</strong></span><span>${study.duration} minutes</span><span>${escape(study.location)}</span></div>${study.booked ? '<div class="summary-banner">You already have a booking for this study.</div>' : slots.length ? `<form id="booking-form"><div class="slot-options">${slots.map((slot) => `<label class="slot-choice"><input type="radio" name="slot_id" value="${escape(slot.id)}" ${sameId(slot.id, selectedSlotId) ? 'checked' : ''} required><span><strong>${dateLabel(slot.starts_at)} · ${timeLabel(slot.starts_at)}</strong><small>${slot.remaining} place${slot.remaining === 1 ? '' : 's'} available</small></span></label>`).join('')}</div><p class="small-note">Times Europe/London. Booking is simulated and saved locally.</p><div class="form-actions"><button class="button">Confirm booking →</button></div></form>` : '<div class="empty">No future places available right now.</div>'}`);
  if (study.booked || slots.length === 0) return;
  document.querySelector('#booking-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const slot = slots.find((item) => sameId(item.id, new FormData(event.target).get('slot_id')));
    await busy(event.submitter, async () => {
      const booking = await api('/bookings', 'POST', { participant_id: participant().id, slot_id: slot.id });
      dialog.close();
      await loadWorkspace();
      notify(`Booked: ${booking.title} · ${dateLabel(booking.starts_at)}, ${timeLabel(booking.starts_at)}.`);
    });
  });
}

function nextSession() {
  const date = new Date();
  date.setDate(date.getDate() + 2);
  date.setHours(14, 0, 0, 0);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}T14:00`;
}

function slotRow(value = nextSession()) {
  return `<div class="slot-row"><label class="field">Session start (your local time)<input type="datetime-local" name="starts_at" value="${value}" required></label><label class="field">Places<input type="number" name="capacity" value="3" min="1" max="100" required></label><button type="button" class="remove-slot" aria-label="Remove session">×</button></div>`;
}

function renderResearcher() {
  const { studies, bookings } = state.researcherData;
  app.innerHTML = `<section class="hero"><div><p class="eyebrow">Researcher workspace</p><h1>Less screening.<br><em>More discovery.</em></h1><p>Describe your study. Review the criteria. Meet the right participants.</p></div><div class="profile-picker"><label>Demo workspace</label><strong>Oxford Research Lab</strong><div class="small-note">Fictional researcher · No account required</div></div></section><div class="researcher-layout"><section class="study-form"><div class="step-label">01 / Describe</div><h2>Create a study</h2><p>Start with a clear description and the people you need.</p><form id="study-form"><div class="form-grid"><label class="field full">Study title<input name="title" value="Visual attention & everyday focus" required maxlength="120"></label><label class="field full">Description & eligibility criteria<textarea name="description" id="study-description" required maxlength="6000">${escape(state.bootstrap.sample_description)}</textarea></label><label class="field">Research topic<select name="topic">${state.bootstrap.topics.map((topic) => `<option value="${escape(topic)}">${escape(topic)}</option>`).join('')}</select></label><label class="field">Format<select name="mode"><option value="in_person">In person</option><option value="online">Online</option></select></label><label class="field full">Location or online meeting details<input name="location" value="Oxford Psychology Research, Oxford" required maxlength="150"></label><label class="field">Duration (minutes)<input name="duration" type="number" value="45" min="5" max="240" required></label><label class="field">Compensation (£)<input name="compensation" type="number" value="12" min="0" max="1000" step="0.5" required></label></div><div class="extract-actions"><button type="button" class="button" id="extract-live" ${state.bootstrap.ai_available ? '' : 'disabled'}>Extract with AI ↗</button><button type="button" class="button secondary" id="extract-sample">Use sample extraction</button><span class="small-note">${state.bootstrap.ai_available ? 'Live AI proposes rules; you make the final decision.' : 'Live AI is not configured. Sample extraction uses a fixed, labelled example.'}</span></div><div id="review"></div></form></section><aside class="sidebar"><section class="panel preference-panel"><p class="eyebrow">At a glance</p><h3>Your research,<br>in motion.</h3><div class="metrics"><div class="metric"><strong>${studies.length}</strong><span>published studies</span></div><div class="metric"><strong>${bookings.length}</strong><span>bookings</span></div></div></section><section class="panel"><h3>Published studies</h3>${studies.length ? studies.map((study) => `<div class="published-study"><strong>${escape(study.title)}</strong><span>${study.slots.length} sessions · ${study.booked_count} booked${study.manual_review ? ' · Manual review' : ''}</span></div>`).join('') : '<p>Your first published study will appear here.</p>'}</section><section class="panel"><h3>Latest bookings</h3>${bookings.length ? bookings.map((booking) => `<div class="booking-item"><strong>${escape(booking.participant_name)}</strong><span>${escape(booking.title)}</span><span>${dateLabel(booking.starts_at)} · ${timeLabel(booking.starts_at)}</span></div>`).join('') : '<p>No bookings yet. Switch to Participant to try the complete flow.</p>'}</section></aside></div>`;
  document.querySelector('#study-description').addEventListener('input', () => { state.draft = null; document.querySelector('#review').innerHTML = ''; });
  document.querySelector('#extract-live').addEventListener('click', (event) => extractRules(event.currentTarget, false));
  document.querySelector('#extract-sample').addEventListener('click', (event) => extractRules(event.currentTarget, true));
  document.querySelector('#study-form').addEventListener('submit', publishStudy);
}

async function extractRules(button, demo) {
  const description = document.querySelector('#study-description');
  if (demo) description.value = state.bootstrap.sample_description;
  if (!description.reportValidity()) return;
  await busy(button, async () => {
    state.draft = await api('/extract', 'POST', { description: description.value, demo });
    renderReview();
    document.querySelector('#review').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}

function renderReview() {
  const draft = state.draft;
  document.querySelector('#review').innerHTML = `<section class="review-area"><div class="step-label">02 / Review & approve</div><h2>These are proposed criteria <span class="badge ${draft.mode === 'sample' ? 'amber' : ''}">${draft.mode === 'sample' ? 'Fixed sample' : 'AI extracted'}</span></h2><p class="small-note">Check every condition against the description. Edit the values and questions before publishing.</p>${draft.review_notes.map((note) => `<div class="review-note">${escape(note)}</div>`).join('')}${draft.rules.map((rule, index) => `<div class="rule-card" data-rule-index="${index}"><blockquote>“${escape(rule.source)}”</blockquote><div class="rule-row"><label class="field">Criterion<select name="rule-field">${[['age', 'Age'], ['english', 'English fluency'], ['vision', 'Normal / corrected vision'], ['question', 'Study-specific question']].map(([value, label]) => `<option value="${value}" ${rule.field === value ? 'selected' : ''}>${label}</option>`).join('')}</select></label><label class="field">Required answer / age range<input name="rule-value" value="${escape(rule.value)}" required></label></div><label class="field question-field">Participant question<input name="rule-question" value="${escape(rule.question)}" required></label><span class="small-note">Age: minimum,maximum · Other answers: true or false</span></div>`).join('')}<label class="check"><input type="checkbox" name="manual_review" ${draft.manual_review ? 'checked disabled' : ''}>Require investigator review before booking${draft.manual_review ? ' (required for this draft)' : ''}</label><hr class="form-divider"><div class="step-label">03 / Offer a time</div><h2>Available sessions</h2><div id="slot-rows">${slotRow()}</div><button type="button" class="text-button" id="add-slot" style="margin-top:12px">+ Add another session</button><hr class="form-divider"><label class="check"><input type="checkbox" name="approved" required>I have reviewed every criterion and screening question against this study’s requirements. Publish this synthetic study.</label><div class="form-actions"><button class="button">Approve & publish study →</button></div></section>`;
  document.querySelector('#add-slot').addEventListener('click', () => document.querySelector('#slot-rows').insertAdjacentHTML('beforeend', slotRow()));
  document.querySelector('#slot-rows').addEventListener('click', (event) => { if (event.target.matches('.remove-slot') && document.querySelectorAll('.slot-row').length > 1) event.target.closest('.slot-row').remove(); });
}

async function publishStudy(event) {
  event.preventDefault();
  if (!state.draft) { notify('Extract and review the criteria first.', true); return; }
  const form = new FormData(event.target);
  const rules = [...document.querySelectorAll('[data-rule-index]')].map((element) => {
    const original = state.draft.rules[Number(element.dataset.ruleIndex)];
    const field = element.querySelector('[name=rule-field]').value;
    return { ...original, field, operator: field === 'age' ? 'between' : 'equals', value: element.querySelector('[name=rule-value]').value, question: element.querySelector('[name=rule-question]').value };
  });
  const slots = [...document.querySelectorAll('.slot-row')].map((element) => ({ starts_at: new Date(element.querySelector('[name=starts_at]').value).toISOString(), capacity: Number(element.querySelector('[name=capacity]').value) }));
  const payload = { draft_id: state.draft.draft_id, title: form.get('title'), description: form.get('description'), topic: form.get('topic'), mode: form.get('mode'), location: form.get('location'), duration: Number(form.get('duration')), compensation: Number(form.get('compensation')), rules, manual_review: state.draft.manual_review || form.has('manual_review'), approved: form.has('approved'), slots };
  await busy(event.submitter, async () => {
    await api('/studies', 'POST', payload);
    await loadWorkspace();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    notify('Study published. Switch to Participant to discover and book it.');
  });
}

async function start() {
  try {
    state.bootstrap = await api('/bootstrap');
    state.participantId = state.bootstrap.participants[0].id;
    await loadWorkspace();
  } catch (error) {
    app.innerHTML = `<div class="empty"><h2>We couldn’t load the workspace.</h2><p>${escape(error.message)}</p><button class="button" id="retry">Try again</button></div>`;
    document.querySelector('#retry').addEventListener('click', start);
  }
}

start();
