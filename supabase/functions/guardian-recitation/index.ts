import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const BUCKET = "imam-home-recitations";
const MAX_FILE_BYTES = 20 * 1024 * 1024;
const MAX_DURATION_MS = 20 * 60 * 1000;
const MAX_DAILY_SUBMISSIONS = 12;
const SIGNED_URL_SECONDS = 1800;
const ALLOWED_ORIGINS = new Set([
  "https://welivequran.online",
  "https://www.welivequran.online",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:5500",
  "http://127.0.0.1:5500"
]);
const SURAH_AYAH_COUNTS = [
  7,286,200,176,120,165,206,75,129,109,123,111,43,52,99,128,111,110,98,135,
  112,78,118,64,77,227,93,88,69,60,34,30,73,54,45,83,182,88,75,85,54,53,
  89,59,37,35,38,29,18,45,60,49,62,55,78,96,29,22,24,13,14,11,18,12,12,
  30,52,52,44,28,28,20,56,40,31,50,40,46,42,29,19,36,25,22,17,19,26,30,
  20,15,21,11,8,8,19,5,8,8,11,11,8,3,9,5,4,7,3,6,3,5,4,5,6
];
const MIME_EXT: Record<string, string> = {
  "audio/webm": "webm",
  "audio/mp4": "m4a",
  "audio/ogg": "ogg",
  "audio/wav": "wav",
  "audio/mpeg": "mp3",
  "audio/aac": "aac"
};
const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});
const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

function json(body: unknown, status = 200, headers: HeadersInit = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...headers }
  });
}
function corsHeaders(req: Request): Record<string, string> | null {
  const origin = req.headers.get("origin");
  if (!origin) return {};
  if (!ALLOWED_ORIGINS.has(origin)) return null;
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin"
  };
}
function normalizeMime(value: string): string {
  const raw = String(value || "").toLowerCase().split(";")[0].trim();
  if (raw === "audio/x-m4a" || raw === "audio/m4a") return "audio/mp4";
  if (raw === "audio/x-wav" || raw === "audio/wave") return "audio/wav";
  return raw;
}
function validUuid(value: unknown): value is string {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ""));
}
function cleanText(value: unknown, max: number): string {
  return String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, max);
}
function validSurahRange(surah: number, from: number, to: number): boolean {
  return Number.isInteger(surah) && surah >= 1 && surah <= 114 &&
    Number.isInteger(from) && Number.isInteger(to) &&
    from >= 1 && to >= from && to <= SURAH_AYAH_COUNTS[surah - 1];
}
function bytesStart(bytes: Uint8Array, text: string, offset = 0): boolean {
  const expected = new TextEncoder().encode(text);
  return expected.every((value, index) => bytes[offset + index] === value);
}
function hasAudioSignature(bytes: Uint8Array, mime: string): boolean {
  if (mime === "audio/webm") return bytes.length >= 4 && bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3;
  if (mime === "audio/ogg") return bytesStart(bytes, "OggS");
  if (mime === "audio/wav") return bytesStart(bytes, "RIFF") && bytesStart(bytes, "WAVE", 8);
  if (mime === "audio/mp4") return bytesStart(bytes, "ftyp", 4);
  if (mime === "audio/mpeg") {
    return bytesStart(bytes, "ID3") || (bytes.length > 1 && bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0);
  }
  if (mime === "audio/aac") return bytes.length > 1 && bytes[0] === 0xff && (bytes[1] & 0xf6) === 0xf0;
  return false;
}
async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
}
function extensionForMime(mime: string): string {
  return MIME_EXT[mime] || "";
}
async function signedUrl(path: string | null): Promise<string | null> {
  if (!path) return null;
  const { data, error } = await admin.storage.from(BUCKET).createSignedUrl(path, SIGNED_URL_SECONDS);
  if (error) throw error;
  return data?.signedUrl || null;
}
async function studentAccess(sessionToken: string, studentRef: string) {
  if (!validUuid(sessionToken) || !/^[0-9a-f]{64}$/.test(studentRef)) throw new Error("SESSION_INVALID");
  const { data: session, error: sessionError } = await admin
    .from("guardian_portal_sessions")
    .select("session_token,account_ids,expires_at,revoked_at")
    .eq("session_token", sessionToken)
    .maybeSingle();
  if (sessionError || !session || session.revoked_at || Date.parse(session.expires_at) <= Date.now()) {
    throw new Error("SESSION_EXPIRED");
  }
  const accountIds = Array.isArray(session.account_ids) ? session.account_ids.filter(validUuid) : [];
  if (!accountIds.length) throw new Error("SESSION_INVALID");
  const { data: accounts, error: accountsError } = await admin
    .from("guardian_portal_accounts")
    .select("id,owner_user_id,disabled_at")
    .in("id", accountIds);
  if (accountsError) throw accountsError;
  const activeAccounts = (accounts || []).filter(row => !row.disabled_at);
  if (!activeAccounts.length) throw new Error("SESSION_REVOKED");
  const { data: shares, error: sharesError } = await admin
    .from("guardian_portal_shares")
    .select("owner_user_id,student_ref,guardian_account_id")
    .eq("student_ref", studentRef)
    .in("guardian_account_id", activeAccounts.map(row => row.id));
  if (sharesError) throw sharesError;
  for (const share of shares || []) {
    const account = activeAccounts.find(row => row.id === share.guardian_account_id && row.owner_user_id === share.owner_user_id);
    if (!account) continue;
    const { data: profile, error: profileError } = await admin
      .from("app_users")
      .select("user_id,status")
      .eq("user_id", share.owner_user_id)
      .maybeSingle();
    if (profileError) throw profileError;
    if (profile?.status === "active") {
      return {
        ownerId: share.owner_user_id,
        accountId: account.id,
        studentRef,
        sessionHash: await sha256Hex(sessionToken)
      };
    }
  }
  throw new Error("STUDENT_NOT_AUTHORIZED");
}
async function teacherAccess(req: Request) {
  const bearer = String(req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!bearer || bearer === SUPABASE_ANON_KEY) throw new Error("TEACHER_AUTH_REQUIRED");
  const { data, error } = await authClient.auth.getUser(bearer);
  if (error || !data?.user?.id) throw new Error("TEACHER_AUTH_INVALID");
  const { data: profile, error: profileError } = await admin
    .from("app_users")
    .select("user_id,status,role")
    .eq("user_id", data.user.id)
    .maybeSingle();
  if (profileError) throw profileError;
  if (!profile || profile.status !== "active" || !["owner", "teacher"].includes(profile.role)) {
    throw new Error("TEACHER_NOT_ACTIVE");
  }
  return { ownerId: data.user.id };
}
async function teacherOwnsStudent(ownerId: string, studentRef: string): Promise<boolean> {
  if (!/^[0-9a-f]{64}$/.test(studentRef)) return false;
  const { data, error } = await admin.from("guardian_portal_shares")
    .select("student_ref,guardian_account_id")
    .eq("owner_user_id", ownerId).eq("student_ref", studentRef)
    .not("guardian_account_id", "is", null).limit(1);
  if (error) throw error;
  if (!data?.length) return false;
  const { data: accounts, error: accountError } = await admin.from("guardian_portal_accounts")
    .select("id,disabled_at").in("id", data.map(row => row.guardian_account_id).filter(Boolean));
  if (accountError) throw accountError;
  return (accounts || []).some(row => !row.disabled_at);
}
async function readJson(req: Request) {
  try { return await req.json(); } catch (_) { throw new Error("INVALID_JSON"); }
}
function parseAnnotations(value: unknown, row: Record<string, unknown>) {
  let source: unknown = value;
  if (typeof source === "string") {
    try { source = JSON.parse(source); } catch (_) { throw new Error("ANNOTATIONS_INVALID"); }
  }
  if (!Array.isArray(source) || source.length > 50) throw new Error("ANNOTATIONS_INVALID");
  const from = Number(row.ayah_from) || 1;
  const to = Number(row.ayah_to) || from;
  const duration = Number(row.duration_ms) || MAX_DURATION_MS;
  return source.map((item, index) => {
    const timeMs = Number(item?.time_ms);
    const ayahNo = item?.ayah_no === null || item?.ayah_no === undefined || item?.ayah_no === "" ? null : Number(item.ayah_no);
    const note = cleanText(item?.note, 300);
    if (!Number.isSafeInteger(timeMs) || timeMs < 0 || timeMs > duration) throw new Error("ANNOTATION_TIME_INVALID");
    if (ayahNo !== null && (!Number.isInteger(ayahNo) || ayahNo < from || ayahNo > to)) throw new Error("ANNOTATION_AYAH_INVALID");
    if (!note) throw new Error("ANNOTATION_NOTE_REQUIRED");
    return { id: validUuid(item?.id) ? item.id : crypto.randomUUID(), time_ms: timeMs, ayah_no: ayahNo, note, order: index };
  });
}
async function uploadAudio(path: string, file: File) {
  const mime = normalizeMime(file.type);
  const extension = extensionForMime(mime);
  if (!extension || !mime.startsWith("audio/") || file.size < 128 || file.size > MAX_FILE_BYTES) {
    throw new Error("AUDIO_FILE_INVALID");
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!hasAudioSignature(bytes.subarray(0, Math.min(bytes.length, 32)), mime)) throw new Error("AUDIO_SIGNATURE_INVALID");
  const body = new Blob([bytes], { type: mime });
  const { error } = await admin.storage.from(BUCKET).upload(path, body, {
    contentType: mime, cacheControl: "3600", upsert: true
  });
  if (error) throw error;
  return { mime, size: file.size, extension };
}
function apiError(error: unknown) {
  const code = String((error as Error)?.message || error || "SERVER_ERROR");
  const known: Record<string, { status: number; message: string }> = {
    SESSION_INVALID: { status: 401, message: "جلسة الدخول غير صالحة. سجّل الدخول مرة أخرى." },
    SESSION_EXPIRED: { status: 401, message: "انتهت جلسة الدخول. أعد تسجيل الدخول مع الاحتفاظ بالتسجيل المعلّق." },
    SESSION_REVOKED: { status: 403, message: "تم إيقاف صلاحية الدخول لهذا الحساب." },
    STUDENT_NOT_AUTHORIZED: { status: 403, message: "هذا الطالب غير مرتبط بجلسة الدخول الحالية." },
    TEACHER_AUTH_REQUIRED: { status: 401, message: "يلزم تسجيل دخول المحفظ." },
    TEACHER_AUTH_INVALID: { status: 401, message: "جلسة المحفظ غير صالحة. سجّل الدخول مجددًا." },
    TEACHER_NOT_ACTIVE: { status: 403, message: "حساب المحفظ غير مفعل." },
    INVALID_JSON: { status: 400, message: "تعذر قراءة الطلب." },
    ANNOTATIONS_INVALID: { status: 400, message: "قائمة علامات التصحيح غير صالحة." },
    ANNOTATION_TIME_INVALID: { status: 400, message: "توقيت إحدى العلامات خارج مدة التسجيل." },
    ANNOTATION_AYAH_INVALID: { status: 400, message: "رقم الآية خارج نطاق التكليف." },
    ANNOTATION_NOTE_REQUIRED: { status: 400, message: "اكتب ملاحظة لكل علامة تصحيح." },
    AUDIO_FILE_INVALID: { status: 400, message: "صيغة التسجيل غير مدعومة أو تجاوز الحجم 20 ميجابايت." },
    AUDIO_SIGNATURE_INVALID: { status: 400, message: "محتوى الملف لا يبدو تسجيلًا صوتيًا صالحًا." },
    SURAH_RANGE_INVALID: { status: 400, message: "راجع السورة ونطاق الآيات." },
    SUBMISSION_NOT_FOUND: { status: 404, message: "التسجيل غير موجود أو غير متاح." },
    RATE_LIMIT: { status: 429, message: "وصل الطالب إلى الحد اليومي للتسجيلات. حاول غدًا." },
    FEEDBACK_EMPTY: { status: 400, message: "أضف نصًا أو علامة تصحيح أو تعليقًا صوتيًا قبل الحفظ." }
  };
  return known[code] || { status: 500, message: "تعذر إكمال العملية الآن. لم يُحذف التسجيل المحلي." };
}
async function studentUpload(req: Request) {
  const form = await req.formData();
  const sessionToken = String(form.get("session_token") || "");
  const studentRef = String(form.get("student_ref") || "");
  const submissionId = String(form.get("submission_id") || "");
  const surahNo = Number(form.get("surah_no"));
  const ayahFrom = Number(form.get("ayah_from"));
  const ayahTo = Number(form.get("ayah_to"));
  const note = cleanText(form.get("student_note"), 500);
  const durationMs = Number(form.get("duration_ms") || 0);
  const file = form.get("file");
  if (!validUuid(submissionId) || !validSurahRange(surahNo, ayahFrom, ayahTo)) throw new Error("SURAH_RANGE_INVALID");
  if (!Number.isInteger(durationMs) || durationMs < 0 || durationMs > MAX_DURATION_MS) throw new Error("AUDIO_FILE_INVALID");
  if (!(file instanceof File)) throw new Error("AUDIO_FILE_INVALID");
  const access = await studentAccess(sessionToken, studentRef);
  const mime = normalizeMime(file.type);
  const extension = extensionForMime(mime);
  if (!extension) throw new Error("AUDIO_FILE_INVALID");
  const sessionHash = access.sessionHash;
  const { data: existing, error: existingError } = await admin.from("student_recitation_submissions")
    .select("*").eq("id", submissionId).maybeSingle();
  if (existingError) throw existingError;
  if (existing) {
    if (existing.owner_user_id !== access.ownerId || existing.student_ref !== studentRef ||
        existing.guardian_account_id !== access.accountId || existing.surah_no !== surahNo ||
        existing.ayah_from !== ayahFrom || existing.ayah_to !== ayahTo || existing.mime_type !== mime) {
      throw new Error("STUDENT_NOT_AUTHORIZED");
    }
    if (existing.status !== "uploading" && existing.status !== "submitted") throw new Error("SUBMISSION_NOT_FOUND");
    if (existing.status === "submitted") return { ok: true, already_uploaded: true, submission_id: submissionId };
    const { error: sessionUpdateError } = await admin.from("student_recitation_submissions")
      .update({ session_token_hash: sessionHash }).eq("id", submissionId).eq("owner_user_id", access.ownerId);
    if (sessionUpdateError) throw sessionUpdateError;
  } else {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count, error: countError } = await admin.from("student_recitation_submissions")
      .select("id", { count: "exact", head: true }).eq("owner_user_id", access.ownerId)
      .eq("student_ref", studentRef).gte("created_at", since);
    if (countError) throw countError;
    if ((count || 0) >= MAX_DAILY_SUBMISSIONS) throw new Error("RATE_LIMIT");
    const storagePath = "recitations/" + access.ownerId + "/" + studentRef + "/" + submissionId + "." + extension;
    const { error: insertError } = await admin.from("student_recitation_submissions").insert({
      id: submissionId, owner_user_id: access.ownerId, guardian_account_id: access.accountId,
      student_ref: studentRef, session_token_hash: sessionHash, surah_no: surahNo,
      ayah_from: ayahFrom, ayah_to: ayahTo, student_note: note, mime_type: mime,
      file_size_bytes: file.size, duration_ms: durationMs, storage_path: storagePath, status: "uploading"
    });
    if (insertError) throw insertError;
  }
  const { data: row, error: rowError } = await admin.from("student_recitation_submissions")
    .select("storage_path").eq("id", submissionId).single();
  if (rowError || !row?.storage_path) throw rowError || new Error("SUBMISSION_NOT_FOUND");
  const uploaded = await uploadAudio(row.storage_path, file);
  const { error: updateError } = await admin.from("student_recitation_submissions").update({
    mime_type: uploaded.mime, file_size_bytes: uploaded.size, duration_ms: durationMs,
    student_note: note, status: "submitted", uploaded_at: new Date().toISOString()
  }).eq("id", submissionId).eq("owner_user_id", access.ownerId);
  if (updateError) throw updateError;
  return { ok: true, already_uploaded: false, submission_id: submissionId };
}
async function studentList(req: Request) {
  const body = await readJson(req);
  const access = await studentAccess(String(body.session_token || ""), String(body.student_ref || ""));
  const { data: rows, error } = await admin.from("student_recitation_submissions")
    .select("id,surah_no,ayah_from,ayah_to,student_note,file_size_bytes,duration_ms,status,created_at,uploaded_at,storage_path")
    .eq("owner_user_id", access.ownerId).eq("student_ref", access.studentRef)
    .neq("status", "archived").order("created_at", { ascending: false }).limit(20);
  if (error) throw error;
  const ids = (rows || []).map(row => row.id);
  const { data: feedbackRows, error: feedbackError } = ids.length
    ? await admin.from("student_recitation_feedback")
      .select("id,submission_id,student_feedback,annotations,audio_path,student_visible,published_at,created_at")
      .in("submission_id", ids).eq("student_visible", true).not("published_at", "is", null)
      .order("created_at", { ascending: false })
    : { data: [], error: null };
  if (feedbackError) throw feedbackError;
  const latest = new Map();
  for (const item of feedbackRows || []) if (!latest.has(item.submission_id)) latest.set(item.submission_id, item);
  const result = [];
  for (const row of rows || []) {
    const feedback = latest.get(row.id);
    result.push({
      id: row.id, surah_no: row.surah_no, ayah_from: row.ayah_from, ayah_to: row.ayah_to,
      student_note: row.student_note, file_size_bytes: row.file_size_bytes, duration_ms: row.duration_ms,
      status: row.status, created_at: row.created_at, uploaded_at: row.uploaded_at,
      audio_url: row.uploaded_at ? await signedUrl(row.storage_path) : null,
      feedback: feedback ? {
        id: feedback.id, student_feedback: feedback.student_feedback,
        annotations: feedback.annotations || [], created_at: feedback.created_at,
        audio_url: await signedUrl(feedback.audio_path)
      } : null
    });
  }
  return { ok: true, submissions: result };
}
async function teacherList(req: Request) {
  const teacher = await teacherAccess(req);
  const body = await readJson(req);
  const studentRef = String(body.student_ref || "");
  if (!await teacherOwnsStudent(teacher.ownerId, studentRef)) throw new Error("STUDENT_NOT_AUTHORIZED");
  const { data: rows, error } = await admin.from("student_recitation_submissions")
    .select("id,surah_no,ayah_from,ayah_to,student_note,file_size_bytes,duration_ms,status,created_at,uploaded_at,storage_path")
    .eq("owner_user_id", teacher.ownerId).eq("student_ref", studentRef)
    .neq("status", "archived").order("created_at", { ascending: false }).limit(30);
  if (error) throw error;
  const ids = (rows || []).map(row => row.id);
  const { data: feedbackRows, error: feedbackError } = ids.length
    ? await admin.from("student_recitation_feedback")
      .select("id,submission_id,student_feedback,teacher_private_note,annotations,audio_path,student_visible,published_at,created_at")
      .in("submission_id", ids).eq("owner_user_id", teacher.ownerId).order("created_at", { ascending: false })
    : { data: [], error: null };
  if (feedbackError) throw feedbackError;
  const latest = new Map();
  for (const item of feedbackRows || []) if (!latest.has(item.submission_id)) latest.set(item.submission_id, item);
  const result = [];
  for (const row of rows || []) {
    const feedback = latest.get(row.id);
    result.push({
      id: row.id, surah_no: row.surah_no, ayah_from: row.ayah_from, ayah_to: row.ayah_to,
      student_note: row.student_note, file_size_bytes: row.file_size_bytes, duration_ms: row.duration_ms,
      status: row.status, created_at: row.created_at, uploaded_at: row.uploaded_at,
      audio_url: row.uploaded_at ? await signedUrl(row.storage_path) : null,
      feedback: feedback ? {
        id: feedback.id, student_feedback: feedback.student_feedback,
        teacher_private_note: feedback.teacher_private_note, annotations: feedback.annotations || [],
        student_visible: feedback.student_visible, created_at: feedback.created_at,
        audio_url: await signedUrl(feedback.audio_path)
      } : null
    });
  }
  return { ok: true, submissions: result };
}
async function teacherFeedback(req: Request) {
  const teacher = await teacherAccess(req);
  const form = await req.formData();
  const submissionId = String(form.get("submission_id") || "");
  if (!validUuid(submissionId)) throw new Error("SUBMISSION_NOT_FOUND");
  const { data: submission, error: submissionError } = await admin.from("student_recitation_submissions")
    .select("*").eq("id", submissionId).eq("owner_user_id", teacher.ownerId).maybeSingle();
  if (submissionError || !submission || submission.status === "archived") throw new Error("SUBMISSION_NOT_FOUND");
  const studentFeedback = cleanText(form.get("student_feedback"), 2000);
  const privateNote = cleanText(form.get("teacher_private_note"), 2000);
  const visible = String(form.get("student_visible") || "") === "true";
  const annotations = parseAnnotations(form.get("annotations") || "[]", submission);
  const file = form.get("audio_file");
  let audioPath: string | null = null;
  const feedbackId = crypto.randomUUID();
  if (file instanceof File && file.size > 0) {
    const mime = normalizeMime(file.type);
    const ext = extensionForMime(mime);
    if (!ext) throw new Error("AUDIO_FILE_INVALID");
    audioPath = "feedback/" + teacher.ownerId + "/" + submissionId + "/" + feedbackId + "." + ext;
    await uploadAudio(audioPath, file);
  }
  if (!studentFeedback && !privateNote && !annotations.length && !audioPath) throw new Error("FEEDBACK_EMPTY");
  if (visible && !studentFeedback && !annotations.length && !audioPath) throw new Error("FEEDBACK_EMPTY");
  const now = new Date().toISOString();
  const { error: insertError } = await admin.from("student_recitation_feedback").insert({
    id: feedbackId, submission_id: submissionId, owner_user_id: teacher.ownerId,
    student_feedback: studentFeedback, teacher_private_note: privateNote, annotations,
    audio_path: audioPath, student_visible: visible, published_at: visible ? now : null, created_at: now
  });
  if (insertError) throw insertError;
  const { error: updateError } = await admin.from("student_recitation_submissions").update({
    status: visible ? "feedback_ready" : "reviewing", reviewed_at: now
  }).eq("id", submissionId).eq("owner_user_id", teacher.ownerId);
  if (updateError) throw updateError;
  return { ok: true, feedback_id: feedbackId, student_visible: visible };
}
async function teacherArchive(req: Request) {
  const teacher = await teacherAccess(req);
  const body = await readJson(req);
  const id = String(body.submission_id || "");
  if (!validUuid(id)) throw new Error("SUBMISSION_NOT_FOUND");
  const { data, error } = await admin.from("student_recitation_submissions").update({
    status: "archived", archived_at: new Date().toISOString()
  }).eq("id", id).eq("owner_user_id", teacher.ownerId).select("id").maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("SUBMISSION_NOT_FOUND");
  return { ok: true, archived: true };
}
async function handle(req: Request): Promise<Response> {
  const cors = corsHeaders(req);
  if (cors === null) return json({ ok: false, error: "ORIGIN_NOT_ALLOWED" }, 403);
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors || {} });
  if (req.method !== "POST") return json({ ok: false, error: "METHOD_NOT_ALLOWED" }, 405, cors || {});
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SERVICE_ROLE_KEY) {
    return json({ ok: false, error: "SERVER_NOT_CONFIGURED" }, 503, cors || {});
  }
  if ((req.headers.get("apikey") || "") !== SUPABASE_ANON_KEY) {
    return json({ ok: false, error: "API_KEY_INVALID" }, 401, cors || {});
  }
  const route = new URL(req.url).pathname.replace(/\/+$/, "").split("/").slice(-2).join("/");
  try {
    let result: unknown;
    if (route === "student/upload") result = await studentUpload(req);
    else if (route === "student/list") result = await studentList(req);
    else if (route === "teacher/list") result = await teacherList(req);
    else if (route === "teacher/feedback") result = await teacherFeedback(req);
    else if (route === "teacher/archive") result = await teacherArchive(req);
    else return json({ ok: false, error: "NOT_FOUND" }, 404, cors || {});
    return json(result, 200, cors || {});
  } catch (error) {
    const code = String((error as Error)?.message || error || "SERVER_ERROR");
    const mapped = apiError(error);
    console.error("[guardian-recitation]", code);
    return json({ ok: false, error: code, message: mapped.message }, mapped.status, cors || {});
  }
}
Deno.serve(handle);
