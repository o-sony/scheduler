import { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, addDoc, updateDoc, deleteDoc, doc, setDoc } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";

// ═══════════════════════════════════════════
// FIREBASE CONFIG — 본인 Firebase 프로젝트 설정값으로 교체하세요
// ═══════════════════════════════════════════
const firebaseConfig = {
  apiKey: "AIzaSyDxxj2BR_u0oiHiAhGGPZh1NLTlOs-Sdjk",
  authDomain: "o-sony-scheduler.firebaseapp.com",
  projectId: "o-sony-scheduler",
  storageBucket: "o-sony-scheduler.firebasestorage.app",
  messagingSenderId: "172351051865",
  appId: "1:172351051865:web:88b6410f4fb59e8aaeb948",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// ═══════════════════════════════════════════
// UTILS
// ═══════════════════════════════════════════
const LS = {
  get: (key, fallback = []) => {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
    catch { return fallback; }
  },
  set: (key, val) => localStorage.setItem(key, JSON.stringify(val)),
};

const MONTHS = ["1월","2월","3월","4월","5월","6월","7월","8월","9월","10월","11월","12월"];
const DAYS = ["일","월","화","수","목","금","토"];

function today() {
  const d = new Date();
  return { y: d.getFullYear(), m: d.getMonth(), day: d.getDate() };
}

function daysInMonth(y, m) { return new Date(y, m + 1, 0).getDate(); }
function firstDayOfMonth(y, m) { return new Date(y, m, 1).getDay(); }

// ═══════════════════════════════════════════
// ICONS (inline SVG)
// ═══════════════════════════════════════════
const Icon = {
  Star: () => <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>,
  Calendar: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  Theater: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 10s3-3 3-8h14c0 5 3 8 3 8"/><path d="M6 22h12"/><path d="M2 10c0 8 4 12 10 12s10-4 10-12"/></svg>,
  Ticket: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v2z"/></svg>,
  Note: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>,
  Chart: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  Stamp: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14.5 10c-.83 0-1.5-.67-1.5-1.5v-5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5v5c0 .83-.67 1.5-1.5 1.5z"/><path d="M20.5 10H19V8.5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/><path d="M9.5 14c.83 0 1.5.67 1.5 1.5v5c0 .83-.67 1.5-1.5 1.5S8 21.33 8 20.5v-5c0-.83.67-1.5 1.5-1.5z"/><path d="M3.5 14H5v1.5c0 .83-.67 1.5-1.5 1.5S2 16.33 2 15.5 2.67 14 3.5 14z"/><path d="M14 22H4a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2"/><line x1="12" y1="14" x2="12" y2="22"/></svg>,
  Edit: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  Trash: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3,6 5,6 21,6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>,
  Plus: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  X: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Link: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>,
  Lock: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
  User: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
};

// ═══════════════════════════════════════════
// MODAL
// ═══════════════════════════════════════════
function Modal({ title, onClose, children }) {
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="icon-btn" onClick={onClose}><Icon.X /></button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// ADMIN LOGIN
// ═══════════════════════════════════════════
function AdminLogin({ onLogin }) {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");

  const handleLogin = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, pw);
      onLogin();
    } catch {
      setErr("이메일 또는 비밀번호가 올바르지 않습니다.");
    }
  };

  return (
    <Modal title="관리자 로그인" onClose={() => {}}>
      <div className="form-group">
        <label>이메일</label>
        <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="admin@example.com" />
      </div>
      <div className="form-group">
        <label>비밀번호</label>
        <input value={pw} onChange={e => setPw(e.target.value)} type="password" placeholder="••••••••"
          onKeyDown={e => e.key === "Enter" && handleLogin()} />
      </div>
      {err && <p className="error-msg">{err}</p>}
      <button className="btn-primary full" onClick={handleLogin}>로그인</button>
    </Modal>
  );
}

// ═══════════════════════════════════════════
// PROFILE TAB
// ═══════════════════════════════════════════
function ProfileTab({ isAdmin, profile, onSave }) {
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState(profile);

  useEffect(() => { setForm(profile); }, [profile]);

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const fLink = (i, k, v) => setForm(p => {
    const links = [...(p.links || [])];
    links[i] = { ...links[i], [k]: v };
    return { ...p, links };
  });
  const addLink = () => setForm(p => ({ ...p, links: [...(p.links || []), { label: "", url: "" }] }));
  const removeLink = i => setForm(p => ({ ...p, links: p.links.filter((_, idx) => idx !== i) }));

  const fHistory = (i, v) => setForm(p => {
    const history = [...(p.history || [])];
    history[i] = v;
    return { ...p, history };
  });
  const addHistory = () => setForm(p => ({ ...p, history: [...(p.history || []), ""] }));
  const removeHistory = i => setForm(p => ({ ...p, history: p.history.filter((_, idx) => idx !== i) }));

  const save = () => { onSave(form); setEdit(false); };

  return (
    <div className="tab-content profile-tab">
      <div className="profile-card">
        <div className="profile-img-wrap">
          {form.imgUrl
            ? <img src={form.imgUrl} alt="프로필" className="profile-img" />
            : <div className="profile-img-placeholder"><Icon.User /></div>}
          {edit && (
            <div className="form-group" style={{marginTop: "0.75rem"}}>
              <label>이미지 URL</label>
              <input value={form.imgUrl || ""} onChange={e => f("imgUrl", e.target.value)} placeholder="https://..." />
            </div>
          )}
        </div>
        <div className="profile-info">
          {edit ? (
            <>
              <div className="form-group"><label>배우명</label><input value={form.name || ""} onChange={e => f("name", e.target.value)} /></div>
              <div className="form-group"><label>소개</label><textarea value={form.bio || ""} onChange={e => f("bio", e.target.value)} rows={3} /></div>
            </>
          ) : (
            <>
              <h2 className="actor-name">{form.name || "배우명"}</h2>
              <p className="actor-bio">{form.bio || "소개를 입력해주세요."}</p>
            </>
          )}

          <div className="profile-section">
            <h4>출연작 이력</h4>
            {edit ? (
              <>
                {(form.history || []).map((h, i) => (
                  <div key={i} className="row-input">
                    <input value={h} onChange={e => fHistory(i, e.target.value)} placeholder="작품명" />
                    <button className="icon-btn danger" onClick={() => removeHistory(i)}><Icon.Trash /></button>
                  </div>
                ))}
                <button className="btn-ghost small" onClick={addHistory}><Icon.Plus /> 추가</button>
              </>
            ) : (
              <ul className="history-list">
                {(form.history || []).map((h, i) => <li key={i}>{h}</li>)}
              </ul>
            )}
          </div>

          <div className="profile-section">
            <h4>링크</h4>
            {edit ? (
              <>
                {(form.links || []).map((l, i) => (
                  <div key={i} className="row-input">
                    <input value={l.label} onChange={e => fLink(i, "label", e.target.value)} placeholder="라벨 (예: 공식 팬카페)" style={{width:"40%"}} />
                    <input value={l.url} onChange={e => fLink(i, "url", e.target.value)} placeholder="https://..." />
                    <button className="icon-btn danger" onClick={() => removeLink(i)}><Icon.Trash /></button>
                  </div>
                ))}
                <button className="btn-ghost small" onClick={addLink}><Icon.Plus /> 추가</button>
              </>
            ) : (
              <div className="link-chips">
                {(form.links || []).map((l, i) => (
                  <a key={i} href={l.url} target="_blank" rel="noreferrer" className="link-chip">
                    <Icon.Link /> {l.label}
                  </a>
                ))}
              </div>
            )}
          </div>

          {isAdmin && (
            edit
              ? <div className="btn-row"><button className="btn-primary" onClick={save}>저장</button><button className="btn-ghost" onClick={() => { setEdit(false); setForm(profile); }}>취소</button></div>
              : <button className="btn-ghost" onClick={() => setEdit(true)}><Icon.Edit /> 편집</button>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// CALENDAR TAB
// ═══════════════════════════════════════════
function CalendarTab({ isAdmin, shows, events, onAddShow, onDeleteShow, onAddEvent, onDeleteEvent }) {
  const t = today();
  const [cur, setCur] = useState({ y: t.y, m: t.m });
  const [selected, setSelected] = useState(null);
  const [modal, setModal] = useState(null); // "show" | "event"
  const [showForm, setShowForm] = useState({ title: "", date: "", theater: "", time: "", grade: "", company: "", runtime: "", curtainCall: false, note: "" });
  const [eventForm, setEventForm] = useState({ title: "", startDate: "", endDate: "", desc: "" });

  const prevMonth = () => setCur(c => c.m === 0 ? { y: c.y - 1, m: 11 } : { ...c, m: c.m - 1 });
  const nextMonth = () => setCur(c => c.m === 11 ? { y: c.y + 1, m: 0 } : { ...c, m: c.m + 1 });

  const totalDays = daysInMonth(cur.y, cur.m);
  const firstDay = firstDayOfMonth(cur.y, cur.m);

  const dateStr = (day) => `${cur.y}-${String(cur.m + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  const showsOnDay = (day) => shows.filter(s => s.date === dateStr(day));
  const eventsOnDay = (day) => events.filter(e => e.startDate <= dateStr(day) && e.endDate >= dateStr(day));

  const dayShows = selected ? showsOnDay(selected) : [];
  const dayEvents = selected ? eventsOnDay(selected) : [];

  const submitShow = () => { onAddShow(showForm); setModal(null); setShowForm({ title: "", date: "", theater: "", time: "", grade: "", company: "", runtime: "", curtainCall: false, note: "" }); };
  const submitEvent = () => { onAddEvent(eventForm); setModal(null); setEventForm({ title: "", startDate: "", endDate: "", desc: "" }); };

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= totalDays; d++) cells.push(d);

  return (
    <div className="tab-content">
      <div className="calendar-header">
        <button className="icon-btn" onClick={prevMonth}>‹</button>
        <h2>{cur.y}년 {MONTHS[cur.m]}</h2>
        <button className="icon-btn" onClick={nextMonth}>›</button>
        {isAdmin && (
          <div className="cal-admin-btns">
            <button className="btn-primary small" onClick={() => setModal("show")}><Icon.Plus /> 공연</button>
            <button className="btn-ghost small" onClick={() => setModal("event")}><Icon.Plus /> 이벤트</button>
          </div>
        )}
      </div>

      <div className="calendar-grid">
        {DAYS.map(d => <div key={d} className="cal-dayname">{d}</div>)}
        {cells.map((d, i) => {
          if (!d) return <div key={`e${i}`} className="cal-cell empty" />;
          const hasShow = showsOnDay(d).length > 0;
          const hasEvent = eventsOnDay(d).length > 0;
          const isToday = d === t.day && cur.m === t.m && cur.y === t.y;
          const isSel = d === selected;
          return (
            <div key={d} className={`cal-cell ${isToday ? "today" : ""} ${isSel ? "selected" : ""}`} onClick={() => setSelected(d === selected ? null : d)}>
              <span className="cal-date">{d}</span>
              {hasShow && <span className="cal-dot show" />}
              {hasEvent && <span className="cal-dot event" />}
            </div>
          );
        })}
      </div>

      {selected && (
        <div className="cal-detail">
          <h3>{cur.m + 1}월 {selected}일</h3>
          {dayShows.length === 0 && dayEvents.length === 0 && <p className="empty-msg">등록된 일정이 없습니다.</p>}
          {dayShows.map(s => (
            <div key={s.id} className="cal-item show-item">
              <div className="cal-item-head">
                <span className="badge show">공연</span>
                <strong>{s.title}</strong>
                {isAdmin && <button className="icon-btn danger small" onClick={() => onDeleteShow(s.id)}><Icon.Trash /></button>}
              </div>
              <div className="cal-item-body">
                {s.time && <span>🕐 {s.time}</span>}
                {s.theater && <span>📍 {s.theater}</span>}
                {s.runtime && <span>⏱ {s.runtime}분</span>}
                {s.grade && <span>🔞 {s.grade}</span>}
                {s.company && <span>🏢 {s.company}</span>}
                {s.curtainCall && <span className="badge cc">커튼콜 촬영 가능</span>}
                {s.note && <p className="note-text">📝 {s.note}</p>}
              </div>
            </div>
          ))}
          {dayEvents.map(e => (
            <div key={e.id} className="cal-item event-item">
              <div className="cal-item-head">
                <span className="badge event">이벤트</span>
                <strong>{e.title}</strong>
                {isAdmin && <button className="icon-btn danger small" onClick={() => onDeleteEvent(e.id)}><Icon.Trash /></button>}
              </div>
              {e.desc && <p className="note-text">{e.desc}</p>}
              <small>{e.startDate} ~ {e.endDate}</small>
            </div>
          ))}
        </div>
      )}

      {modal === "show" && (
        <Modal title="공연 추가" onClose={() => setModal(null)}>
          {[["title","공연명"],["date","날짜 (YYYY-MM-DD)"],["theater","극장명"],["time","공연 시간"],["grade","관람등급"],["company","제작사"],["runtime","러닝타임(분)"]].map(([k, label]) => (
            <div className="form-group" key={k}>
              <label>{label}</label>
              <input value={showForm[k]} onChange={e => setShowForm(p => ({ ...p, [k]: e.target.value }))} />
            </div>
          ))}
          <div className="form-group checkbox-group">
            <label><input type="checkbox" checked={showForm.curtainCall} onChange={e => setShowForm(p => ({ ...p, curtainCall: e.target.checked }))} /> 커튼콜 촬영 가능</label>
          </div>
          <div className="form-group">
            <label>특이사항(비고)</label>
            <textarea value={showForm.note} onChange={e => setShowForm(p => ({ ...p, note: e.target.value }))} rows={2} />
          </div>
          <button className="btn-primary full" onClick={submitShow}>추가</button>
        </Modal>
      )}

      {modal === "event" && (
        <Modal title="이벤트 추가" onClose={() => setModal(null)}>
          <div className="form-group"><label>이벤트명</label><input value={eventForm.title} onChange={e => setEventForm(p => ({ ...p, title: e.target.value }))} /></div>
          <div className="form-group"><label>시작일</label><input value={eventForm.startDate} onChange={e => setEventForm(p => ({ ...p, startDate: e.target.value }))} placeholder="YYYY-MM-DD" /></div>
          <div className="form-group"><label>종료일</label><input value={eventForm.endDate} onChange={e => setEventForm(p => ({ ...p, endDate: e.target.value }))} placeholder="YYYY-MM-DD" /></div>
          <div className="form-group"><label>설명</label><textarea value={eventForm.desc} onChange={e => setEventForm(p => ({ ...p, desc: e.target.value }))} rows={2} /></div>
          <button className="btn-primary full" onClick={submitEvent}>추가</button>
        </Modal>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════
// MY SCHEDULE TAB
// ═══════════════════════════════════════════
function MyScheduleTab({ shows }) {
  const [myShows, setMyShows] = useState(() => LS.get("myShows", []));
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ showId: "", date: "", seat: "", price: "", memo: "" });

  const save = () => {
    const next = [...myShows, { ...form, id: Date.now().toString() }];
    setMyShows(next); LS.set("myShows", next); setModal(false);
    setForm({ showId: "", date: "", seat: "", price: "", memo: "" });
  };
  const del = (id) => { const next = myShows.filter(s => s.id !== id); setMyShows(next); LS.set("myShows", next); };

  const getShowName = (id) => shows.find(s => s.id === id)?.title || id;

  return (
    <div className="tab-content">
      <div className="tab-header">
        <h2>내 관람 일정</h2>
        <button className="btn-primary small" onClick={() => setModal(true)}><Icon.Plus /> 추가</button>
      </div>

      {myShows.length === 0
        ? <p className="empty-msg">아직 관람 일정이 없습니다.</p>
        : <div className="card-list">
            {myShows.map(s => (
              <div key={s.id} className="schedule-card">
                <div className="schedule-card-head">
                  <span className="show-title">{getShowName(s.showId) || s.showId}</span>
                  <button className="icon-btn danger small" onClick={() => del(s.id)}><Icon.Trash /></button>
                </div>
                <div className="schedule-info">
                  {s.date && <span>📅 {s.date}</span>}
                  {s.seat && <span>💺 {s.seat}</span>}
                  {s.price && <span>💰 {Number(s.price).toLocaleString()}원</span>}
                </div>
                {s.memo && <p className="note-text">{s.memo}</p>}
              </div>
            ))}
          </div>
      }

      {modal && (
        <Modal title="관람 일정 추가" onClose={() => setModal(false)}>
          <div className="form-group">
            <label>공연 선택</label>
            <select value={form.showId} onChange={e => setForm(p => ({ ...p, showId: e.target.value }))}>
              <option value="">-- 직접 입력 --</option>
              {shows.map(s => <option key={s.id} value={s.id}>{s.title} ({s.date})</option>)}
            </select>
          </div>
          {!form.showId && <div className="form-group"><label>공연명 직접 입력</label><input value={form.showId} onChange={e => setForm(p => ({ ...p, showId: e.target.value }))} /></div>}
          <div className="form-group"><label>관람 날짜</label><input value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} placeholder="YYYY-MM-DD" /></div>
          <div className="form-group"><label>좌석</label><input value={form.seat} onChange={e => setForm(p => ({ ...p, seat: e.target.value }))} placeholder="예: A구역 3열 15번" /></div>
          <div className="form-group"><label>티켓 금액</label><input type="number" value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))} placeholder="0" /></div>
          <div className="form-group"><label>메모</label><textarea value={form.memo} onChange={e => setForm(p => ({ ...p, memo: e.target.value }))} rows={2} /></div>
          <button className="btn-primary full" onClick={save}>저장</button>
        </Modal>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════
// DIARY TAB
// ═══════════════════════════════════════════
function DiaryTab({ shows }) {
  const [diaries, setDiaries] = useState(() => LS.get("diaries", []));
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ showId: "", date: "", content: "", imgUrl: "" });

  const save = () => {
    const next = [...diaries, { ...form, id: Date.now().toString() }];
    setDiaries(next); LS.set("diaries", next); setModal(false);
    setForm({ showId: "", date: "", content: "", imgUrl: "" });
  };
  const del = (id) => { const next = diaries.filter(d => d.id !== id); setDiaries(next); LS.set("diaries", next); };
  const getShowName = (id) => shows.find(s => s.id === id)?.title || id;

  return (
    <div className="tab-content">
      <div className="tab-header">
        <h2>관람 후기</h2>
        <button className="btn-primary small" onClick={() => setModal(true)}><Icon.Plus /> 작성</button>
      </div>

      {diaries.length === 0
        ? <p className="empty-msg">첫 번째 덕질 일기를 작성해보세요 ✨</p>
        : <div className="diary-list">
            {[...diaries].reverse().map(d => (
              <div key={d.id} className="diary-card">
                <div className="diary-head">
                  <div>
                    <span className="diary-show">{getShowName(d.showId) || d.showId}</span>
                    <span className="diary-date">{d.date}</span>
                  </div>
                  <button className="icon-btn danger small" onClick={() => del(d.id)}><Icon.Trash /></button>
                </div>
                {d.imgUrl && <img src={d.imgUrl} alt="" className="diary-img" />}
                <p className="diary-content">{d.content}</p>
              </div>
            ))}
          </div>
      }

      {modal && (
        <Modal title="관람 후기 작성" onClose={() => setModal(false)}>
          <div className="form-group">
            <label>공연</label>
            <select value={form.showId} onChange={e => setForm(p => ({ ...p, showId: e.target.value }))}>
              <option value="">-- 직접 입력 --</option>
              {shows.map(s => <option key={s.id} value={s.id}>{s.title} ({s.date})</option>)}
            </select>
          </div>
          {!form.showId && <div className="form-group"><label>공연명</label><input value={form.showId} onChange={e => setForm(p => ({ ...p, showId: e.target.value }))} /></div>}
          <div className="form-group"><label>관람 날짜</label><input value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} placeholder="YYYY-MM-DD" /></div>
          <div className="form-group"><label>이미지 URL (선택)</label><input value={form.imgUrl} onChange={e => setForm(p => ({ ...p, imgUrl: e.target.value }))} placeholder="https://..." /></div>
          <div className="form-group"><label>후기</label><textarea value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))} rows={5} placeholder="오늘의 공연 어땠나요?" /></div>
          <button className="btn-primary full" onClick={save}>저장</button>
        </Modal>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════
// STATS TAB
// ═══════════════════════════════════════════
function StatsTab({ shows }) {
  const myShows = LS.get("myShows", []);
  const total = myShows.reduce((a, s) => a + (Number(s.price) || 0), 0);

  const byShow = {};
  myShows.forEach(s => {
    const name = shows.find(sh => sh.id === s.showId)?.title || s.showId || "기타";
    if (!byShow[name]) byShow[name] = { count: 0, total: 0 };
    byShow[name].count++;
    byShow[name].total += Number(s.price) || 0;
  });

  const byMonth = {};
  myShows.forEach(s => {
    if (!s.date) return;
    const key = s.date.slice(0, 7);
    if (!byMonth[key]) byMonth[key] = 0;
    byMonth[key] += Number(s.price) || 0;
  });
  const months = Object.keys(byMonth).sort();

  return (
    <div className="tab-content">
      <h2>지출 통계</h2>
      <div className="stats-total">
        <span>총 지출</span>
        <strong>{total.toLocaleString()}원</strong>
      </div>

      <h3>공연별</h3>
      {Object.keys(byShow).length === 0
        ? <p className="empty-msg">관람 기록이 없습니다.</p>
        : <div className="stats-list">
            {Object.entries(byShow).map(([name, { count, total: t }]) => (
              <div key={name} className="stats-row">
                <span className="stats-name">{name}</span>
                <span className="stats-count">{count}회</span>
                <span className="stats-amount">{t.toLocaleString()}원</span>
              </div>
            ))}
          </div>
      }

      <h3 style={{marginTop:"1.5rem"}}>월별</h3>
      {months.length === 0
        ? <p className="empty-msg">관람 기록이 없습니다.</p>
        : <div className="stats-list">
            {months.map(m => (
              <div key={m} className="stats-row">
                <span className="stats-name">{m}</span>
                <span className="stats-amount">{byMonth[m].toLocaleString()}원</span>
                <div className="stats-bar-wrap">
                  <div className="stats-bar" style={{width: `${Math.round(byMonth[m] / Math.max(...Object.values(byMonth)) * 100)}%`}} />
                </div>
              </div>
            ))}
          </div>
      }
    </div>
  );
}

// ═══════════════════════════════════════════
// STAMP TAB
// ═══════════════════════════════════════════
function StampTab({ isAdmin, shows, stampConfig, onSaveConfig }) {
  const myShows = LS.get("myShows", []);
  const [editConfig, setEditConfig] = useState(false);
  const [cfg, setCfg] = useState(stampConfig);
  useEffect(() => { setCfg(stampConfig); }, [stampConfig]);

  const byShow = {};
  myShows.forEach(s => {
    const name = shows.find(sh => sh.id === s.showId)?.title || s.showId || "기타";
    if (!byShow[name]) byShow[name] = 0;
    byShow[name]++;
  });

  const addBenefit = () => setCfg(c => ({ ...c, benefits: [...(c.benefits || []), { count: 0, desc: "" }] }));
  const removeBenefit = i => setCfg(c => ({ ...c, benefits: c.benefits.filter((_, idx) => idx !== i) }));
  const updateBenefit = (i, k, v) => setCfg(c => {
    const benefits = [...c.benefits];
    benefits[i] = { ...benefits[i], [k]: v };
    return { ...c, benefits };
  });

  return (
    <div className="tab-content">
      <div className="tab-header">
        <h2>재관람 도장판</h2>
        {isAdmin && <button className="btn-ghost small" onClick={() => setEditConfig(true)}><Icon.Edit /> 혜택 설정</button>}
      </div>

      {Object.keys(byShow).length === 0
        ? <p className="empty-msg">관람 기록이 없습니다.</p>
        : Object.entries(byShow).map(([name, count]) => {
            const nextBenefit = (cfg.benefits || []).filter(b => b.count > count).sort((a, b) => a.count - b.count)[0];
            const earned = (cfg.benefits || []).filter(b => b.count <= count);
            return (
              <div key={name} className="stamp-card">
                <div className="stamp-card-head">
                  <strong>{name}</strong>
                  <span className="stamp-count">{count}회 관람</span>
                </div>
                <div className="stamps">
                  {Array.from({ length: count }).map((_, i) => (
                    <span key={i} className="stamp filled"><Icon.Star /></span>
                  ))}
                  {nextBenefit && Array.from({ length: nextBenefit.count - count }).map((_, i) => (
                    <span key={`e${i}`} className="stamp empty" />
                  ))}
                </div>
                {earned.length > 0 && (
                  <div className="stamp-benefits">
                    {earned.map((b, i) => <span key={i} className="benefit-chip earned">✓ {b.count}회: {b.desc}</span>)}
                  </div>
                )}
                {nextBenefit && <p className="next-benefit">→ {nextBenefit.count - count}회 더 보면 <strong>{nextBenefit.desc}</strong></p>}
              </div>
            );
          })
      }

      {editConfig && (
        <Modal title="혜택 설정" onClose={() => setEditConfig(false)}>
          {(cfg.benefits || []).map((b, i) => (
            <div key={i} className="row-input">
              <input type="number" value={b.count} onChange={e => updateBenefit(i, "count", Number(e.target.value))} placeholder="회차" style={{width:"80px"}} />
              <span style={{padding:"0 0.5rem"}}>회</span>
              <input value={b.desc} onChange={e => updateBenefit(i, "desc", e.target.value)} placeholder="혜택 설명" />
              <button className="icon-btn danger" onClick={() => removeBenefit(i)}><Icon.Trash /></button>
            </div>
          ))}
          <button className="btn-ghost small" onClick={addBenefit}><Icon.Plus /> 추가</button>
          <button className="btn-primary full" style={{marginTop:"1rem"}} onClick={() => { onSaveConfig(cfg); setEditConfig(false); }}>저장</button>
        </Modal>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════
// DDAY TAB
// ═══════════════════════════════════════════
function DDayTab({ isAdmin, ddays, onAdd, onDelete }) {
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ title: "", date: "", note: "" });

  const getDDay = (dateStr) => {
    const diff = Math.ceil((new Date(dateStr) - new Date()) / 86400000);
    if (diff === 0) return "D-DAY";
    if (diff > 0) return `D-${diff}`;
    return `D+${Math.abs(diff)}`;
  };

  const submit = () => { onAdd(form); setModal(false); setForm({ title: "", date: "", note: "" }); };

  const sorted = [...ddays].sort((a, b) => new Date(a.date) - new Date(b.date));

  return (
    <div className="tab-content">
      <div className="tab-header">
        <h2>예매 오픈 / D-day</h2>
        {isAdmin && <button className="btn-primary small" onClick={() => setModal(true)}><Icon.Plus /> 추가</button>}
      </div>

      {sorted.length === 0
        ? <p className="empty-msg">등록된 D-day가 없습니다.</p>
        : <div className="dday-list">
            {sorted.map(d => (
              <div key={d.id} className="dday-card">
                <div className="dday-badge">{getDDay(d.date)}</div>
                <div className="dday-info">
                  <strong>{d.title}</strong>
                  <span>{d.date}</span>
                  {d.note && <span className="note-text">{d.note}</span>}
                </div>
                {isAdmin && <button className="icon-btn danger small" onClick={() => onDelete(d.id)}><Icon.Trash /></button>}
              </div>
            ))}
          </div>
      }

      {modal && (
        <Modal title="D-day 추가" onClose={() => setModal(false)}>
          <div className="form-group"><label>제목</label><input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="예: 뮤지컬 XX 예매 오픈" /></div>
          <div className="form-group"><label>날짜</label><input value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} placeholder="YYYY-MM-DD" /></div>
          <div className="form-group"><label>메모</label><input value={form.note} onChange={e => setForm(p => ({ ...p, note: e.target.value }))} /></div>
          <button className="btn-primary full" onClick={submit}>추가</button>
        </Modal>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════
// APP ROOT
// ═══════════════════════════════════════════
export default function App() {
  const [tab, setTab] = useState("calendar");
  const [isAdmin, setIsAdmin] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [shows, setShows] = useState([]);
  const [events, setEvents] = useState([]);
  const [ddays, setDdays] = useState([]);
  const [profile, setProfile] = useState({ name: "", bio: "", imgUrl: "", history: [], links: [] });
  const [stampConfig, setStampConfig] = useState({ benefits: [] });

  // Firebase auth listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, user => { setIsAdmin(!!user); setShowLogin(false); });
    return unsub;
  }, []);

  // Firestore load
  useEffect(() => {
    const load = async () => {
      try {
        const [showsSnap, eventsSnap, ddaysSnap, profileSnap, stampSnap] = await Promise.all([
          getDocs(collection(db, "shows")),
          getDocs(collection(db, "events")),
          getDocs(collection(db, "ddays")),
          getDocs(collection(db, "profile")),
          getDocs(collection(db, "stampConfig")),
        ]);
        setShows(showsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        setEvents(eventsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        setDdays(ddaysSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        if (!profileSnap.empty) setProfile(profileSnap.docs[0].data());
        if (!stampSnap.empty) setStampConfig(stampSnap.docs[0].data());
      } catch (e) { console.error("Firebase load error:", e); }
    };
    load();
  }, []);

  const addShow = async (form) => {
    const ref = await addDoc(collection(db, "shows"), form);
    setShows(p => [...p, { id: ref.id, ...form }]);
  };
  const deleteShow = async (id) => {
    await deleteDoc(doc(db, "shows", id));
    setShows(p => p.filter(s => s.id !== id));
  };
  const addEvent = async (form) => {
    const ref = await addDoc(collection(db, "events"), form);
    setEvents(p => [...p, { id: ref.id, ...form }]);
  };
  const deleteEvent = async (id) => {
    await deleteDoc(doc(db, "events", id));
    setEvents(p => p.filter(e => e.id !== id));
  };
  const addDDay = async (form) => {
    const ref = await addDoc(collection(db, "ddays"), form);
    setDdays(p => [...p, { id: ref.id, ...form }]);
  };
  const deleteDDay = async (id) => {
    await deleteDoc(doc(db, "ddays", id));
    setDdays(p => p.filter(d => d.id !== id));
  };
  const saveProfile = async (data) => {
    setProfile(data);
    await setDoc(doc(db, "profile", "main"), data);
  };
  const saveStampConfig = async (data) => {
    setStampConfig(data);
    await setDoc(doc(db, "stampConfig", "main"), data);
  };

  const TABS = [
    { id: "calendar", label: "캘린더", icon: <Icon.Calendar /> },
    { id: "dday", label: "D-day", icon: <Icon.Ticket /> },
    { id: "myschedule", label: "내 일정", icon: <Icon.Theater /> },
    { id: "diary", label: "후기", icon: <Icon.Note /> },
    { id: "stats", label: "지출", icon: <Icon.Chart /> },
    { id: "stamp", label: "도장판", icon: <Icon.Stamp /> },
    { id: "profile", label: "프로필", icon: <Icon.User /> },
  ];

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-inner">
          <div className="header-title">
            <Icon.Star />
            <span>{profile.name || "배우 팬사이트"}</span>
          </div>
          <div className="header-admin">
            {isAdmin
              ? <button className="btn-ghost small" onClick={() => signOut(auth)}>로그아웃</button>
              : <button className="icon-btn" title="관리자" onClick={() => setShowLogin(true)}><Icon.Lock /></button>
            }
          </div>
        </div>
      </header>

      <nav className="tab-nav">
        {TABS.map(t => (
          <button key={t.id} className={`tab-btn ${tab === t.id ? "active" : ""}`} onClick={() => setTab(t.id)}>
            <span className="tab-icon">{t.icon}</span>
            <span className="tab-label">{t.label}</span>
          </button>
        ))}
      </nav>

      <main className="app-main">
        {tab === "calendar" && <CalendarTab isAdmin={isAdmin} shows={shows} events={events} onAddShow={addShow} onDeleteShow={deleteShow} onAddEvent={addEvent} onDeleteEvent={deleteEvent} />}
        {tab === "dday" && <DDayTab isAdmin={isAdmin} ddays={ddays} onAdd={addDDay} onDelete={deleteDDay} />}
        {tab === "myschedule" && <MyScheduleTab shows={shows} />}
        {tab === "diary" && <DiaryTab shows={shows} />}
        {tab === "stats" && <StatsTab shows={shows} />}
        {tab === "stamp" && <StampTab isAdmin={isAdmin} shows={shows} stampConfig={stampConfig} onSaveConfig={saveStampConfig} />}
        {tab === "profile" && <ProfileTab isAdmin={isAdmin} profile={profile} onSave={saveProfile} />}
      </main>

      {showLogin && <AdminLogin onLogin={() => setShowLogin(false)} />}
    </div>
  );
}
