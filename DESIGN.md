---
name: StudyMatch
description: A precise, light research operating workspace.
colors:
  ink: "#252630"
  muted: "#646874"
  soft: "#f8f9fb"
  rail: "#f5f5f7"
  line: "#e6e7ec"
  accent: "#5c50c6"
  accent-hover: "#493dab"
  success: "#287254"
  success-soft: "#eff8f3"
  warning: "#8e621e"
  warning-soft: "#fcf6e9"
typography:
  headline:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "1.5rem"
    fontWeight: 650
    lineHeight: 1.3
    letterSpacing: "-.025em"
  title:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "1rem"
    fontWeight: 620
    lineHeight: 1.45
    letterSpacing: "-.012em"
  body:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: ".875rem"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: ".8125rem"
    fontWeight: 500
    lineHeight: 1.55
rounded:
  "4": "4px"
  "5": "5px"
  "6": "6px"
  "7": "7px"
  "8": "8px"
  "12": "12px"
spacing:
  "4": "4px"
  "8": "8px"
  "12": "12px"
  "16": "16px"
  "20": "20px"
  "24": "24px"
  "28": "28px"
  "32": "32px"
  "36": "36px"
  "40": "40px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "white"
    rounded: "{rounded.6}"
    padding: "7px 13px"
  button-primary-hover:
    backgroundColor: "{colors.accent-hover}"
  button-secondary:
    backgroundColor: "#fff"
    textColor: "{colors.ink}"
    rounded: "{rounded.6}"
    padding: "7px 13px"
  button-text:
    backgroundColor: "transparent"
    textColor: "{colors.accent}"
    padding: "0"
  button-icon:
    backgroundColor: "transparent"
    textColor: "{colors.muted}"
    rounded: "{rounded.5}"
    height: "32px"
    width: "32px"
  field:
    backgroundColor: "#fff"
    textColor: "{colors.ink}"
    rounded: "{rounded.5}"
    padding: "8px 10px"
  navigation-item:
    textColor: "#555966"
    rounded: "{rounded.5}"
    padding: "9px 10px"
  navigation-item-active:
    backgroundColor: "#e9e7f4"
    textColor: "#5147aa"
  status:
    backgroundColor: "#f0f1f4"
    textColor: "#616573"
    rounded: "{rounded.4}"
    padding: "3px 6px"
  status-success:
    backgroundColor: "{colors.success-soft}"
    textColor: "{colors.success}"
  status-pending:
    backgroundColor: "{colors.warning-soft}"
    textColor: "{colors.warning}"
  tag-picker:
    textColor: "#5e626f"
    rounded: "{rounded.5}"
    padding: "7px 10px"
  import-section:
    backgroundColor: "#fcfcfe"
    rounded: "{rounded.12}"
    padding: "21px"
  study-row:
    backgroundColor: "white"
    padding: "22px 4px"
---

# Design System: StudyMatch

## Overview

**Creative North Star: "Linear-style operating workspace"**

StudyMatch is a compact, precise workspace for research participation and recruitment. A pale neutral navigation rail, white working canvas, restrained indigo actions and aligned study rows make the task hierarchy visible without decorative imagery.

The interface is flat and quiet: crisp system-sans typography, thin dividers and small corners carry structure. Preference fit, scientific eligibility and researcher approval remain distinct concepts with explicit text. The synthetic-data disclosure stays visible on desktop and mobile.

**Key Characteristics:**

- Collapsible left navigation and flexible, aligned working rows.
- Restrained indigo actions on light neutral surfaces.
- Text-labelled states and preference scores.
- Responsive reflow with visible synthetic-data disclosure.

This document records the implemented system in `frontend/styles.css` and `frontend/src/*.jsx`. Color keys preserve existing CSS custom-property names without the leading `--`. Numeric spacing and radius keys catalogue existing literal values; they do not introduce CSS variables. Selected yes/no controls use the existing `--accent-soft` tint. Surface-specific composition remains in `.impeccable/surfaces/workspace.md`.

## Colors

Cool neutral surfaces and dark ink give the indigo interaction color a restrained role. Frontmatter owns the token values; component-specific literal colors remain as implemented.

### Primary

- **Indigo (`accent`):** primary actions, links, range thumbs, selected profile tabs, caret and keyboard focus.
- **Deep indigo (`accent-hover`):** primary-action hover background and border.

### Neutral

- **Ink (`ink`):** headings, primary text and important facts.
- **Muted slate (`muted`):** descriptions, secondary metadata and supporting labels.
- **Soft canvas (`soft`):** segmented controls and secondary-action hover.
- **Pale rail (`rail`):** persistent desktop navigation and compact mobile navigation.
- **Divider (`line`):** row boundaries, structural separators and container borders.

Green (`success`, `success-soft`) identifies ready-to-book, booked and confirmed states. Amber (`warning`, `warning-soft`) identifies outstanding questions and review attention. Neutral status styling identifies researcher-led review. Error messages use the existing component-specific red text and pale red fill, paired with an alert icon and message.

**The State Text Rule.** Color supports explicit status wording; it never replaces the distinction between preference fit, eligibility and publication approval.

## Typography

One sans-serif stack serves the whole interface. Inter is the first declared choice, with platform sans-serif fallbacks; the application does not bundle an Inter font file. The root is (16px), and text sizes use rem units. There is no display or serif pairing.

Headlines, section titles, body and form labels follow the frontmatter hierarchy. Study titles use (.9375rem, weight 600) on desktop and (.875rem) on mobile. Main headlines reduce to (1.375rem) on mobile. Supporting copy usually uses (.8125rem); decision metadata uses (.75rem). Descriptions are constrained to (72–75ch), with study-row summaries clamped to two lines. Scores and times use tabular numerals.

**The Decision Label Rule.** Screening status, preference-fit labels, next availability and slot capacity stay at least (.75rem / 12px at the default root), including mobile. Some secondary navigation and bookkeeping captions use smaller existing sizes; this is not a claim that all interface text is 12px or larger.

## Layout

The desktop shell uses a left navigation rail (220px) and a flexible main column. The rail is sticky at the viewport top and fills (100svh); closing it reduces it to an icon rail (72px) while keeping the StudyMatch logo mark, navigation icons, demo label and logout available. An accessible open/close control remains visible. Discovery and study details have no right sidebar. Study rows retain an aligned score column (84px), and score explanations use an inline disclosure below the study content. The main working area is capped at (1600px), with standard page padding (32px 36px 60px). There is no workspace banner.

At (min-width: 1650px), page side padding becomes (48px). At (max-width: 1150px), the expanded rail is (195px) and page side padding becomes (25px); the collapsed rail remains (72px). Above (1150px), the calendar and upcoming-bookings list use a flexible grid column plus a (240px) list column with a (28px) gap. At (max-width: 1150px), bookings move below the calendar. The (900px) breakpoint adjusts study and researcher rows without moving a preferences panel or changing the rail width.

At (max-width: 650px), the shell becomes a single column with static top navigation. Open navigation uses two columns of destinations; closed navigation hides those destinations while keeping the full logo, open control, demo label and logout. Page padding becomes (26px 18px 40px), search and discovery filters fill their rows, form fields stack, calendar controls wrap, and researcher rows reflow. The calendar defaults to day view on mobile. Participant decision rows preserve the (84px) score column and allow availability and status text to wrap. Booking status is restored below the stacked booking details on mobile. Main content and flexible columns use zero minimum width to support reflow without horizontal overflow.

Authentication uses a centered form capped at (380px), with a (40px) total horizontal inset. Form, creation and detail pages have separate existing caps of (820px), (900px) and (1260px). Use the implemented spacing rhythm; retain compact controls and generous section separation instead of adding decorative card grids.

## Elevation & Depth

Working surfaces use borders and tonal changes, with no resting card shadows. Only the transient notice is raised, using `box-shadow: 0 5px 20px #20202a20`. Navigation, rows, forms and import containers stay flat.

State transitions last (150ms) for button backgrounds and borders, field borders, tags, study-row hover and disclosure rotation. The notice enters over (180ms) using `cubic-bezier(.16,1,.3,1)` and a clip-path reveal. Reduced-motion preference removes animation and transitions and restores automatic scrolling.

## Shapes

Small corners follow the extracted radius scale: status labels and segmented options use the smallest step; fields, navigation and interest choices use the next; primary controls, session choices and messages share the middle step. Segmented-control shells and notices use (7px); the collapsible import container uses (12px). Rows are separated by fine horizontal rules rather than rounded cards. Dots and range thumbs are circular. Lucide line icons accompany text or receive accessible labels when used alone.

## Components

### Buttons

Primary actions use indigo with white text, a matching border, minimum height (36px), and (.8125rem, weight 550) text. Secondary actions use white, a neutral border and ink text. Hover and pressed colors are explicit in CSS. Text actions remain unfilled and underline on hover; icon-only controls are (32px) square. Disabled buttons use opacity (.48) and a not-allowed cursor.

All keyboard-focusable controls retain the global (2px) indigo outline. Controls normally offset it (3px); study rows inset it (-2px) to keep the full-row target visible.

### Inputs / Fields

Visible labels sit above white fields with a thin neutral border, minimum height (39px) and (.8125rem) text. Hover strengthens the border; focus changes it to indigo. Disabled inputs and selects use muted fill and text. Search uses a compact outlined shell with a focus-within border. Password visibility and destructive row controls have accessible names. Errors render as an explicit alert message; do not infer an unimplemented per-field error border.

### Navigation

The pale left rail uses compact icon-and-text buttons, with no role label beneath the logo. Active navigation has an indigo-tinted background, stronger text and `aria-current="page"`. Hover uses a neutral tint. The open/close button names its action and exposes its expanded state. Collapsed desktop icons retain accessible destination labels and tooltips; the logo mark stays visible. Mobile retains the full wordmark and hides or reveals the destination grid. Participant destinations are Discover studies, My schedule, Profile & preferences and Notifications. The demo label and logout remain available in either state.

### Chips and status labels

Interest choices are checkbox labels with bordered, softly rounded outlines; selected choices use a pale indigo fill and stronger border. Static topic tags are quiet neutral labels. Status labels pair a dot or icon with text: “Ready to book” and “Booked” use success styling, remaining questions use pending styling, and “Researcher review” uses neutral styling. Long status text wraps rather than truncates. Slot choices also label full sessions, conflicts and remaining capacity explicitly.

### Containers and study rows

Study rows are full-width buttons containing title, summary, compensation, duration, format and availability, with a separate right-aligned preference score. Row hover uses a subtle neutral fill. “Simple PDF or text import” is a disclosure above the study facts. Imported editable text contains the cleaned description and eligibility requirements; original source text lives in a separate disclosure. The AI preview uses natural-language descriptions and eligibility; raw criterion and convenience editors are absent. Researchers choose at least one known topic and select an example or custom location only for in-person studies. Changes to facts or topics require a fresh preview. Session choices use borders and a tinted selected state; unavailable choices are dimmed and disabled.

### Profile, preferences and prescreen

Signup presents the questionnaire, interests and priority sliders in one form; Find studies saves them together before discovery. Completed profiles retain direct Preferences and Prescreen questionnaire tabs, opening on Preferences. Save preferences updates only interests and weights. Save questionnaire preserves saved preferences. No Continue step gates existing preference editing.

The prescreen uses a native birth-date picker, language and university choices with an Other option, and labelled Yes/No radio buttons. Seven additional general questions are optional. The medical/safety section is removed from the interface; legacy stored answers remain intact. Optional boolean answers can be cleared to unknown; no missing answer defaults to No. Additional languages use a language selector, a Beginner/Intermediate/Fluent selector and an explicit Add language action. Existing fluency is preserved; proficiency is never guessed.

### Calendar and upcoming bookings

FullCalendar supplies a Google Calendar-style week/day time grid with previous, next and Today controls. The full 24-hour range is scrollable; initial scroll starts around 08:00. Green (#d8eee2) marks confirmed bookings and grey (#e5e7eb) marks candidate sessions, with a legend and explicit selected-session status. Half-hour rows and events have a 90px minimum height; titles wrap across lines rather than use ellipses. Selecting a session shows details and a separate confirmation action; there is no drag rescheduling or Google integration. An upcoming-bookings list shows future confirmed sessions in date order, including date, time, duration and location, without requiring calendar navigation. View booking reveals session details; Study details is available when the study remains a current match. The list sits beside the calendar above (1150px) and below it at narrower widths.

### Priorities and feedback

Interests and priority sliders appear during signup and remain editable in Profile & preferences. Three labelled sliders show Earnings, Interests and Convenience with values from 1–5. “Save preferences” applies the weights and refreshes match ordering; moving a slider alone does not save it. The format/duration/location/time and notification preference section is removed, including its hidden discovery filters. Discovery keeps separate topic and eligibility filters alongside format and search; eligibility choices are All matches, Eligible immediately, Potential matches and Researcher review. Preference fit is labelled separately from eligibility and never presented as medical clearance.

Notifications use flat divided rows with event type, timestamp, title and message. Match alerts, booking confirmations and review updates are identified as an in-app demonstration. A study action appears only when the study is still a current match. Empty and error states retain useful recovery text.

Loading uses static skeleton rows with a status label. Empty views provide an icon, a short title and actionable text. Success notices use a dismissible status region; errors use an alert region. Researcher publication retains an explicit review checkbox and “Publish study” action. Participant review requests have pending, approved and declined states; researcher approval requires an explicit attestation that external checks are complete. Synthetic-data wording appears in the authentication footer, workspace navigation and publication context.

## Do's and Don'ts

### Do:

- Do preserve aligned rows, thin dividers and the light navigation rail.
- Do keep decision labels readable at the documented mobile size.
- Do pair semantic color with explicit status text.
- Do keep synthetic-data disclosure visible on mobile and desktop.
- Do retain keyboard focus, reduced-motion behavior and honest loading, empty and error states.

### Don't:

- Don't reintroduce the rejected cream/serif marketing hero, gradients, emoji icons or ornamental imagery.
- Don't replace working rows with decorative equal-card grids.
- Don't reintroduce right preference panels or a Continue gate for preference editing.
- Don't conflate preference fit with eligibility, researcher approval or medical clearance.
- Don't hide mobile status or synthetic-data wording to make the layout fit.
- Don't promote illustrative sidecar tonal ramps into application tokens.
