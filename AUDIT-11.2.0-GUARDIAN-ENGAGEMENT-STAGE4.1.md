# Audit — v11.2.0 Stage 4.1 Guardian Engagement

- Local Schema: 12 (unchanged)
- Student/session rows: untouched
- New backend table: `guardian_portal_activity_events`
- New public RPC: `guardian_portal_activity_log` — requires a valid opaque guardian session and authorized student_ref
- New teacher RPC: `guardian_portal_activity_summary` — requires active authenticated teacher
- Existing `guardian_portal_session_read` is extended only by returning opaque `student_ref`
- Direct table access revoked for anon/authenticated browser roles
- No phone/PIN/message/audio/IP/user-agent fields stored
- View events have a 5-minute dedupe guard; repeat/playback events stay countable
- Activity logging failures never block learning/player flows
- Stage 4 direct WhatsApp and audio sharing behavior preserved
