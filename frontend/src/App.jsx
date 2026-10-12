import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const STATUSES = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
const CATEGORIES = ['BUG', 'BILLING', 'ACCESS', 'OTHER'];
const label = (s) => s.replace('_', ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());

const NAV = [
  { icon: '📊', text: 'Dashboard', active: true },
  { icon: '🎫', text: 'Tickets' },
  { icon: '👥', text: 'Customers' },
  { icon: '📚', text: 'Knowledge base' },
  { icon: '⚙️', text: 'Settings' },
];

const PIPELINE = ['Test', 'SAST', 'SCA', 'Secrets', 'Build', 'Trivy', 'GHCR', 'Deploy'];

async function api(path, options = {}) {
  const res = await fetch(path, { headers: { 'Content-Type': 'application/json' }, ...options });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const detail = Array.isArray(body.detail) ? body.detail.map((d) => d.msg).join(', ') : body.detail;
    throw new Error(detail || `Request failed (${res.status})`);
  }
  return res.status === 204 ? null : res.json();
}

function timeAgo(iso) {
  const secs = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return 'just now';
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

export default function App() {
  const [tickets, setTickets] = useState([]);
  const [stats, setStats] = useState(null);
  const [filter, setFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const dialogRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const [list, s] = await Promise.all([api('/api/tickets'), api('/api/tickets/stats')]);
      setTickets(list);
      setStats(s);
      setError('');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tickets.filter(
      (t) =>
        (filter === 'ALL' || t.status === filter) &&
        (!q || `${t.title} ${t.requester_email} ${t.assignee}`.toLowerCase().includes(q)),
    );
  }, [tickets, filter, search]);

  const activity = useMemo(
    () => [...tickets].sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at)).slice(0, 6),
    [tickets],
  );

  async function mutate(fn) {
    try {
      await fn();
      await load();
    } catch (e) {
      setError(e.message);
    }
  }

  const updateStatus = (id, status) =>
    mutate(() => api(`/api/tickets/${id}`, { method: 'PUT', body: JSON.stringify({ status }) }));
  const remove = (t) => {
    if (window.confirm(`Delete ticket #${t.id} "${t.title}"?`)) mutate(() => api(`/api/tickets/${t.id}`, { method: 'DELETE' }));
  };

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-logo" aria-hidden="true">🎧</span>
          <span className="brand-name">HelpDesk</span>
        </div>
        <nav aria-label="Main">
          {NAV.map((n) => (
            <a key={n.text} href="#" className={`nav-item${n.active ? ' active' : ''}`} aria-current={n.active ? 'page' : undefined}>
              <span aria-hidden="true">{n.icon}</span>
              <span className="nav-text">{n.text}</span>
            </a>
          ))}
        </nav>
        <div className="workspace">
          <span className="dot ok" aria-hidden="true" />
          <span className="nav-text">Support · Production</span>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <h1>Support dashboard</h1>
            <p className="muted">Track, triage and resolve customer tickets.</p>
          </div>
          <div className="topbar-actions">
            <input
              type="search"
              className="search"
              placeholder="Search tickets…"
              aria-label="Search tickets"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button className="btn primary" onClick={() => dialogRef.current.showModal()}>
              + New ticket
            </button>
          </div>
        </header>

        {error && (
          <div className="alert" role="alert">
            <strong>Backend unavailable.</strong> {error}
            <button className="btn ghost" onClick={load}>
              Retry
            </button>
          </div>
        )}

        <section className="kpis" aria-label="Ticket metrics">
          <Kpi title="Open" value={stats?.open} tone="blue" />
          <Kpi title="In progress" value={stats?.in_progress} tone="amber" />
          <Kpi title="Resolved" value={stats?.resolved} tone="green" />
          <Kpi title="Urgent & active" value={stats?.urgent_open} tone="red" />
        </section>

        <div className="grid">
          <section className="card tickets" aria-label="Tickets">
            <div className="card-head">
              <h2>Tickets</h2>
              <div className="chips" role="group" aria-label="Filter by status">
                {['ALL', ...STATUSES].map((s) => (
                  <button key={s} className={`chip${filter === s ? ' on' : ''}`} aria-pressed={filter === s} onClick={() => setFilter(s)}>
                    {s === 'ALL' ? 'All' : label(s)}
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <div className="state">
                <span className="spinner" aria-hidden="true" /> Loading tickets…
              </div>
            ) : visible.length === 0 ? (
              <div className="state">No tickets here. Create one with “New ticket”.</div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Subject</th>
                    <th>Requester</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Assignee</th>
                    <th>
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((t) => (
                    <tr key={t.id}>
                      <td data-label="#">{t.id}</td>
                      <td data-label="Subject">
                        <div className="subject">{t.title}</div>
                        <div className="muted small">{label(t.category)} · {timeAgo(t.created_at)}</div>
                      </td>
                      <td data-label="Requester" className="wrap">{t.requester_email}</td>
                      <td data-label="Priority">
                        <span className={`badge p-${t.priority.toLowerCase()}`}>{label(t.priority)}</span>
                      </td>
                      <td data-label="Status">
                        <select
                          className={`status s-${t.status.toLowerCase()}`}
                          value={t.status}
                          aria-label={`Status of ticket ${t.id}`}
                          onChange={(e) => updateStatus(t.id, e.target.value)}
                        >
                          {STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {label(s)}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td data-label="Assignee">{t.assignee}</td>
                      <td data-label="Actions">
                        <button className="btn ghost danger" onClick={() => remove(t)} aria-label={`Delete ticket ${t.id}`}>
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <div className="side">
            <section className="card" aria-label="Recent activity">
              <h2>Recent activity</h2>
              {activity.length === 0 ? (
                <p className="muted">No activity yet.</p>
              ) : (
                <ul className="feed">
                  {activity.map((t) => (
                    <li key={t.id}>
                      <span className={`dot s-${t.status.toLowerCase()}`} aria-hidden="true" />
                      <div>
                        <div>
                          <strong>#{t.id}</strong> {t.title}
                        </div>
                        <div className="muted small">
                          {label(t.status)} · {timeAgo(t.updated_at)}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="card" aria-label="Delivery pipeline">
              <h2>Delivery pipeline</h2>
              <ol className="pipeline">
                {PIPELINE.map((p) => (
                  <li key={p}>
                    <span className="tick" aria-hidden="true">✓</span>
                    {p}
                  </li>
                ))}
              </ol>
              <p className="muted small">Every image is tested, scanned and tagged with its Git commit SHA.</p>
            </section>
          </div>
        </div>
      </main>

      <NewTicketDialog dialogRef={dialogRef} onCreated={load} />
    </div>
  );
}

function Kpi({ title, value, tone }) {
  return (
    <div className={`kpi ${tone}`}>
      <span className="kpi-title">{title}</span>
      <span className="kpi-value">{value ?? '—'}</span>
    </div>
  );
}

function NewTicketDialog({ dialogRef, onCreated }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    if (!data.assignee) delete data.assignee;
    setSaving(true);
    try {
      await api('/api/tickets', { method: 'POST', body: JSON.stringify(data) });
      form.reset();
      setError('');
      dialogRef.current.close();
      onCreated();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <dialog ref={dialogRef} className="modal" aria-labelledby="new-ticket-title">
      <form onSubmit={submit}>
        <h2 id="new-ticket-title">New ticket</h2>
        <label>
          Subject
          <input name="title" required minLength={3} maxLength={200} placeholder="e.g. Cannot reset password" />
        </label>
        <label>
          Requester email
          <input name="requester_email" type="email" required placeholder="customer@example.com" />
        </label>
        <label>
          Description
          <textarea name="description" rows={3} maxLength={5000} placeholder="What happened?" />
        </label>
        <div className="row">
          <label>
            Category
            <select name="category" defaultValue="OTHER">
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {label(c)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Priority
            <select name="priority" defaultValue="MEDIUM">
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {label(p)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label>
          Assignee
          <input name="assignee" maxLength={120} placeholder="Unassigned" />
        </label>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="modal-actions">
          <button type="button" className="btn ghost" onClick={() => dialogRef.current.close()}>
            Cancel
          </button>
          <button type="submit" className="btn primary" disabled={saving}>
            {saving ? 'Creating…' : 'Create ticket'}
          </button>
        </div>
      </form>
    </dialog>
  );
}
