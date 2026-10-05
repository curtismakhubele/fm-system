import { useEffect, useState } from "react";

const API = "https://your-api.example.com/api"; // <- your backend URL
const STATUSES = ["active", "on_leave", "off_duty", "suspended"];

// ---------- tiny API helper ----------
export async function api(path, method = "GET", body) {
  const token = sessionStorage.getItem("token");
  const res = await fetch(API + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Something went wrong");
  return data;
}

export async function login(email, password) {
  const data = await api("/login", "POST", { email, password });
  sessionStorage.setItem("token", data.token);
  return data; // { role, name, mustChange } -> if mustChange, show <ChangePassword />
}

const box = { border: "1px solid #ddd", borderRadius: 8, padding: 16, marginBottom: 16 };
const input = { display: "block", width: "100%", padding: 8, margin: "6px 0", boxSizing: "border-box" };

// ---------- Personnel: change own password ----------
export function ChangePassword({ onDone }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [msg, setMsg] = useState("");

  const submit = async () => {
    try {
      await api("/me/password", "POST", { current, next });
      setMsg("Password updated.");
      setCurrent(""); setNext("");
      onDone?.();
    } catch (e) { setMsg(e.message); }
  };

  return (
    <div style={box}>
      <h3>Change password</h3>
      <input style={input} type="password" placeholder="Current password" value={current} onChange={(e) => setCurrent(e.target.value)} />
      <input style={input} type="password" placeholder="New password (min 8 characters)" value={next} onChange={(e) => setNext(e.target.value)} />
      <button onClick={submit}>Update password</button>
      {msg && <p>{msg}</p>}
    </div>
  );
}

// ---------- Personnel: request a status change (needs admin approval) ----------
export function StatusRequest() {
  const [status, setStatus] = useState("active");
  const [msg, setMsg] = useState("");

  const submit = async () => {
    try { setMsg((await api("/me/status-request", "POST", { status })).message); }
    catch (e) { setMsg(e.message); }
  };

  return (
    <div style={box}>
      <h3>Request status change</h3>
      <select style={input} value={status} onChange={(e) => setStatus(e.target.value)}>
        {STATUSES.map((s) => <option key={s}>{s}</option>)}
      </select>
      <button onClick={submit}>Send for approval</button>
      {msg && <p>{msg}</p>}
    </div>
  );
}

// ---------- Personnel: my tasks ----------
export function MyTasks() {
  const [tasks, setTasks] = useState([]);
  useEffect(() => { api("/me/tasks").then(setTasks).catch(() => {}); }, []);
  return (
    <div style={box}>
      <h3>My work</h3>
      {tasks.length === 0 && <p>Nothing assigned yet.</p>}
      {tasks.map((t) => (
        <p key={t.id}><b>{t.title}</b>{t.due ? ` (due ${t.due})` : ""}<br />{t.description}</p>
      ))}
    </div>
  );
}

// ---------- Admin: credentials ----------
export function AdminCredentials() {
  const [users, setUsers] = useState([]);
  const [activity, setActivity] = useState([]);
  const [form, setForm] = useState({ name: "", email: "", whatsapp: "", role: "personnel" });
  const [shown, setShown] = useState(null); // { name, password } - displayed once
  const [err, setErr] = useState("");

  const load = () => {
    api("/admin/users").then(setUsers).catch((e) => setErr(e.message));
    api("/admin/password-activity").then(setActivity).catch(() => {});
  };
  useEffect(load, []);

  const add = async () => {
    try {
      const r = await api("/admin/users", "POST", form);
      setShown({ name: form.name, password: r.tempPassword });
      setForm({ name: "", email: "", whatsapp: "", role: "personnel" });
      load();
    } catch (e) { setErr(e.message); }
  };

  const reset = async (u) => {
    if (!window.confirm(`Generate a new password for ${u.name}? Their old one stops working.`)) return;
    const r = await api(`/admin/users/${u.id}/reset-password`, "POST");
    setShown({ name: u.name, password: r.tempPassword });
    load();
  };

  const setPw = async (u) => {
    const password = window.prompt(`New password for ${u.name} (min 8 characters):`);
    if (!password) return;
    try { await api(`/admin/users/${u.id}/set-password`, "POST", { password }); load(); }
    catch (e) { setErr(e.message); }
  };

  return (
    <div style={box}>
      <h3>Credentials</h3>
      {err && <p style={{ color: "crimson" }}>{err}</p>}

      {shown && (
        <div style={{ background: "#fff8dc", padding: 12, borderRadius: 6, marginBottom: 12 }}>
          Temporary password for <b>{shown.name}</b>: <code>{shown.password}</code><br />
          <small>Shown once only. Copy it now and share it securely. They must change it at first login.</small>
          <div><button onClick={() => navigator.clipboard.writeText(shown.password)}>Copy</button>{" "}
            <button onClick={() => setShown(null)}>Dismiss</button></div>
        </div>
      )}

      <input style={input} placeholder="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      <input style={input} placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
      <input style={input} placeholder="WhatsApp (+27821234567)" value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} />
      <select style={input} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
        <option value="personnel">personnel</option>
        <option value="admin">admin</option>
      </select>
      <button onClick={add}>Add & generate password</button>

      <table style={{ width: "100%", marginTop: 16 }}>
        <thead><tr><th align="left">Name</th><th align="left">Email</th><th align="left">Status</th><th /></tr></thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td>{u.name}</td><td>{u.email}</td><td>{u.status}</td>
              <td>
                <button onClick={() => reset(u)}>Generate new</button>{" "}
                <button onClick={() => setPw(u)}>Set password</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h4>Password activity</h4>
      {activity.slice(0, 15).map((a) => (
        <div key={a.id}><small>{a.at} - {a.person}: {a.action.replaceAll("_", " ")} (by {a.actor})</small></div>
      ))}
    </div>
  );
}

// ---------- Admin: approve / reject status requests ----------
export function AdminApprovals() {
  const [rows, setRows] = useState([]);
  const load = () => api("/admin/status-requests").then(setRows).catch(() => {});
  useEffect(() => { load(); }, []);

  const decide = async (id, approve) => {
    await api(`/admin/status-requests/${id}/decide`, "POST", { approve });
    load();
  };

  return (
    <div style={box}>
      <h3>Status approvals</h3>
      {rows.length === 0 && <p>No pending requests.</p>}
      {rows.map((r) => (
        <p key={r.id}>
          <b>{r.name}</b>: {r.current_status} → <b>{r.requested_status}</b>{" "}
          <button onClick={() => decide(r.id, true)}>Approve</button>{" "}
          <button onClick={() => decide(r.id, false)}>Reject</button>
        </p>
      ))}
    </div>
  );
}

// ---------- Admin: assign work (sends email + WhatsApp) ----------
export function AssignTask() {
  const [users, setUsers] = useState([]);
  const [f, setF] = useState({ assigneeId: "", title: "", description: "", due: "" });
  const [msg, setMsg] = useState("");

  useEffect(() => { api("/admin/users").then(setUsers).catch(() => {}); }, []);

  const submit = async () => {
    try {
      const r = await api("/admin/tasks", "POST", f);
      setMsg(`Assigned. Notifications: ${r.notifications.join(", ") || "none (no contact details)"}`);
      setF({ assigneeId: "", title: "", description: "", due: "" });
    } catch (e) { setMsg(e.message); }
  };

  return (
    <div style={box}>
      <h3>Assign work</h3>
      <select style={input} value={f.assigneeId} onChange={(e) => setF({ ...f, assigneeId: e.target.value })}>
        <option value="">Choose person…</option>
        {users.filter((u) => u.role === "personnel").map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
      </select>
      <input style={input} placeholder="Title" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
      <textarea style={input} placeholder="Details" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
      <input style={input} type="date" value={f.due} onChange={(e) => setF({ ...f, due: e.target.value })} />
      <button onClick={submit}>Assign & notify</button>
      {msg && <p>{msg}</p>}
    </div>
  );
}

/* Usage in your app:
   Personnel screen:  <ChangePassword /> <StatusRequest /> <MyTasks />
   Admin screen:      <AdminCredentials /> <AdminApprovals /> <AssignTask />
*/
