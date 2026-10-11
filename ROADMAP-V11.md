# Quran Academy Platform — v11/v12 Roadmap

## v11.0 — Premium UI/UX & Design System
Professional visual system, simplified teacher command center, responsive navigation, unified cards/forms/modals, offline/sync state visibility, dark mode and progressive cleanup of crowded screens.

## v11.1 — Quran Learning & Home Tahfeez Center — IN PROGRESS (Stage 1 delivered)
Guardian/student Tahfeez button; select surah, reciter and ayah range; full player controls; previous/next ayah; play/pause/stop; repeat full range, one ayah or sub-range; configurable repeat counts; speed; tutor/talqeen mode; offline download; assignments open directly in the player.

## v11.2 — Interactive Recitation & Error Marking
Runs during **new memorization while the student reads to the teacher**, **student repetition behind the teacher/talqeen**, final recitation and review. Teacher taps a Quran word/letter and records the error: tashkeel, letter pronunciation, omitted/added letter, wrong word, hesitation, forgetting, madd, ghunnah, idgham, ikhfa, iqlab, qalqalah, waqf/ibtida or other tajweed issue. Each mark stores the learning context and correction state. `Mastered` keeps the history while marking the issue corrected. The system generates a marked Quran-text image for home revision while preserving structured annotations for later analytics.

## v11.3 — Smart Revision Engine
Persistent error notebook, repeated-error heatmap and spaced review schedule based on the learner's actual errors and mastery state. Daily revision list appears to teacher, learner and guardian.

## v11.4 — Goals & Memorization Planning
Long-term memorization target, weekly lesson capacity, automatic breakdown into sessions, milestone tracking, ahead/behind-plan calculation and guardian-friendly progress view.

## v11.5 — Student Finance & Monthly Accounting
Per-student session price and monthly session agreement; attendance-aware monthly entitlement; discounts/additions/brought-forward balance; immutable payment ledger; amount due/paid/remaining; month close; guardian financial summary; statement/receipt sharing.

## v11.6 — Parent ↔ Teacher Communication Center
In-app guardian notes/messages, categories, read/replied states, teacher replies and retained conversation history, while WhatsApp stays available as an external channel.

## v11.7 — Teacher Rating & Supervision Center
Structured guardian/student teacher rating; supervision role; teacher/circle/learner dashboards; attendance, progress, repeated review, ratings, unresolved messages and audit trail with scoped permissions.

## v11.8 — Certificates & Achievements
Certificates for surahs, ajzaa, milestones, tajweed and consistency; teacher/supervisor approval option; certificate number, QR verification, PDF/print/share.

## v11.9 — Student Home Practice & Audio Submission
Learner follows assigned range, listens/repeats, records recitation and submits it to the teacher; teacher attaches text/audio feedback to the relevant Quran range.

## v11.10 — Android Native Bridge
Same platform/data with Android wrapper/native bridge: direct WhatsApp conversation handoff, background Quran audio, native media controls, downloads, Android back, share sheet, file/camera integration, notifications and stronger mobile offline integration.

## v11.11 — Notifications & Smart Reminders
Configurable session, revision, payment, message, certificate and audio-submission notifications with noise controls.

## v11.12 — Advanced Academy Analytics
Academy → teacher → circle → student drill-down for mastery, attendance, improvement/decline, Quran weakness locations, tajweed error patterns, plan completion and operational follow-up.

## v12.0 — AI Recitation Assistant
Audio-assisted error suggestions for omissions/additions/likely word errors or difficult locations. AI proposes; the teacher confirms or rejects. It never replaces the teacher's Quran/tajweed judgment.

## Engineering rules

- Current student/session data is protected.
- Database growth is additive; destructive migrations are avoided.
- Each stage follows: package → replace files while preserving `.git` → commit without push → review → SQL only when required → push → real-device validation.
- Local schema is changed only when a real local-data migration is necessary.
