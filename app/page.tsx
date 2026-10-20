"use client";
import { FormEvent, useEffect, useState } from "react";
import {
  Activity,
  BarChart3,
  FileKey,
  FileCheck2,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Users,
  Wallet,
  X,
  Copy,
  Check,
  Plus,
} from "lucide-react";
import { portalApi, PortalError, Session } from "@/lib/portal-api";
const nav = [
  ["Overview", LayoutDashboard],
  ["Customers", Users],
  ["KYC", FileCheck2],
  ["Wallet Funding", Wallet],
  ["Purchases", Activity],
  ["Transactions", Activity],
  ["Product Catalogue", Package],
  ["Analytics", BarChart3],
  ["API Keys", FileKey],
] as const;
const store = (s: Session) =>
  sessionStorage.setItem("vestra_portal_session", JSON.stringify(s));
export default function App() {
  const [s, setS] = useState<Session | null>(null);
  useEffect(
    () =>
      setS(
        JSON.parse(sessionStorage.getItem("vestra_portal_session") || "null"),
      ),
    [],
  );
  return s ? (
    <Dashboard
      s={s}
      out={() => {
        sessionStorage.removeItem("vestra_portal_session");
        setS(null);
      }}
    />
  ) : (
    <Login
      ok={(x) => {
        store(x);
        setS(x);
      }}
    />
  );
}
function Login({ ok }: { ok: (s: Session) => void }) {
  const [mode, setMode] = useState("login"),
    [email, setEmail] = useState(""),
    [pass, setPass] = useState(""),
    [otp, setOtp] = useState(""),
    [msg, setMsg] = useState(""),
    [busy, setBusy] = useState(false);
  const go = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "login") ok(await portalApi.login(email, pass));
      else if (mode === "verify") ok(await portalApi.verify(email, otp));
      else if (mode === "forgot") {
        await portalApi.forgot(email);
        setMode("reset");
        setMsg("A reset code has been sent.");
      } else {
        await portalApi.reset(email, otp, pass);
        setMode("login");
        setMsg("Password updated. Sign in to continue.");
      }
    } catch (e) {
      const x = e as PortalError;
      if (x.code === "MERCHANT_EMAIL_VERIFICATION_REQUIRED") {
        setMode("verify");
        setMsg("Verify your email to continue.");
      } else setMsg(x.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <main className="grid min-h-screen place-items-center bg-[#f7f8f5] p-5">
      <form
        onSubmit={go}
        className="w-full max-w-md rounded-lg border border-[#e2e8e0] bg-white p-7 shadow-sm"
      >
        <div className="mb-8 flex items-center gap-3">
          <img
            src="https://res.cloudinary.com/dv5awigtg/image/upload/e_trim,c_fill,g_center,w_160,h_160/v1792498635/black_on_white_vertical_f1kolh.png"
            alt="Vestra"
            className="h-10 w-10 rounded-md bg-white object-cover"
          />
          <div>
            <b>Vestra</b>
            <p className="text-[10px] tracking-widest text-slate-500">
              MERCHANT PORTAL
            </p>
          </div>
        </div>
        <h1 className="text-2xl font-semibold">
          {mode === "login"
            ? "Welcome back"
            : mode === "verify"
              ? "Verify your email"
              : mode === "forgot"
                ? "Reset password"
                : "Choose a new password"}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Secure access for your merchant organisation.
        </p>
        {msg && (
          <p className="mt-4 rounded-md bg-[#eef6ef] p-3 text-sm text-[#24563a]">
            {msg}
          </p>
        )}
        <div className="mt-6 space-y-4">
          <input
            className="field"
            type="email"
            required
            placeholder="Work email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {(mode === "verify" || mode === "reset") && (
            <input
              className="field"
              required
              placeholder="Six-digit code"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
            />
          )}{" "}
          {mode !== "verify" && (
            <input
              className="field"
              type="password"
              required
              placeholder={mode === "login" ? "Password" : "New password"}
              value={pass}
              onChange={(e) => setPass(e.target.value)}
            />
          )}
          <button
            className="btn w-full justify-center bg-[#1c4f35] text-white"
            disabled={busy}
          >
            {busy
              ? "Please wait…"
              : mode === "login"
                ? "Sign in"
                : mode === "verify"
                  ? "Verify email"
                  : mode === "forgot"
                    ? "Send reset code"
                    : "Reset password"}
          </button>
        </div>
        <div className="mt-5 flex justify-between text-xs text-[#1c4f35]">
          {mode === "login" ? (
            <>
              <button type="button" onClick={() => setMode("forgot")}>
                Forgot password?
              </button>
              <button type="button" onClick={() => setMode("verify")}>
                Verify email
              </button>
            </>
          ) : (
            <button type="button" onClick={() => setMode("login")}>
              Back to sign in
            </button>
          )}
          {mode === "verify" && (
            <button
              type="button"
              onClick={async () => {
                await portalApi.resend(email);
                setMsg("A new code has been sent.");
              }}
            >
              Resend code
            </button>
          )}
        </div>
      </form>
    </main>
  );
}
function Dashboard({ s, out }: { s: Session; out: () => void }) {
  const [tab, setTab] = useState("Overview"),
    [mobile, setMobile] = useState(false),
    [data, setData] = useState<any>(null),
    [err, setErr] = useState(""),
    [loading, setLoading] = useState(true);
  const load = async () => {
    setLoading(true);
    setErr("");
    try {
      const fn: any =
        tab === "Overview"
          ? portalApi.overview
          : tab === "Customers"
            ? portalApi.customers
            : tab === "Transactions"
              ? portalApi.transactions
              : tab === "Product Catalogue"
                ? portalApi.products
                : tab === "API Keys"
                  ? portalApi.keys
                  : null;
      setData(fn ? await fn(s.token) : null);
    } catch (e) {
      const x = e as PortalError;
      if (
        x.status === 401 ||
        x.status === 403 ||
        x.code === "MERCHANT_ACCOUNT_SUSPENDED"
      )
        out();
      else setErr(x.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, [tab]);
  return (
    <main className="min-h-screen lg:flex">
      <aside
        className={
          "fixed inset-y-0 left-0 z-30 w-[252px] bg-[#123b2a] p-5 text-[#c7dbcd] transition-transform lg:static " +
          (mobile ? "translate-x-0" : "-translate-x-full lg:translate-x-0")
        }
      >
        <div className="mb-8 flex items-center gap-3">
          <img
            src="https://res.cloudinary.com/dv5awigtg/image/upload/e_trim,c_fill,g_center,w_240,h_240/v1792499633/white_transparent_icon_1_n3jrdy.png"
            alt="Vestra"
            className="h-8 w-8 object-cover"
          />
          <div>
            <b className="text-white">Vestra</b>
            <p className="text-[10px] tracking-widest">MERCHANT PORTAL</p>
          </div>
          <button
            className="ml-auto lg:hidden"
            onClick={() => setMobile(false)}
          >
            <X />
          </button>
        </div>
        {nav.map(([n, I]) => {
          const Icon = I;
          return (
            <button
              key={n}
              onClick={() => {
                setTab(n);
                setMobile(false);
              }}
              className={
                "flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm " +
                (tab === n ? "bg-[#285640] text-white" : "hover:bg-[#1c4a34]")
              }
            >
              <Icon size={17} />
              {n}
            </button>
          );
        })}
        <button onClick={out} className="absolute bottom-6 flex gap-2 text-sm">
          <LogOut size={16} />
          Sign out
        </button>
      </aside>
      <section className="min-w-0 flex-1">
        <header className="flex h-[73px] items-center justify-between border-b border-[#e1e6df] bg-white px-5 lg:px-8">
          <div className="flex gap-3">
            <button className="lg:hidden" onClick={() => setMobile(true)}>
              <Menu />
            </button>
            <div>
              <b>{tab}</b>
              <p className="text-xs text-slate-500">
                {s.merchant.name} · {s.merchant.code}
              </p>
            </div>
          </div>
          <div className="grid h-9 w-9 place-items-center rounded-full bg-[#e8efe9] text-sm text-[#1d5136]">
            {s.merchant.name.slice(0, 2)}
          </div>
        </header>
        <div className="p-5 lg:p-8">
          {loading ? (
            <State t="Loading live dashboard data…" />
          ) : err ? (
            <State t={err} retry={load} />
          ) : (
            <Page
              tab={tab}
              data={data}
              token={s.token}
              organisation={s.merchant.name}
              reload={load}
            />
          )}
        </div>
      </section>
    </main>
  );
}
function State({ t, retry }: { t: string; retry?: () => void }) {
  return (
    <div className="grid min-h-[300px] place-items-center text-center">
      <div>
        <Activity className="mx-auto mb-3 text-[#1c4f35]" />
        <p className="text-sm text-slate-600">{t}</p>
        {retry && (
          <button className="btn mt-4" onClick={retry}>
            Try again
          </button>
        )}
      </div>
    </div>
  );
}
function Page({
  tab,
  data,
  token,
  organisation,
  reload,
}: {
  tab: string;
  data: any;
  token: string;
  organisation: string;
  reload: () => void;
}) {
  if (tab === "API Keys")
    return (
      <Keys
        data={data}
        token={token}
        organisation={organisation}
        reload={reload}
      />
    );
  if (tab === "Overview") {
    const livePairs = Object.entries(data || {}).filter(
      ([, x]) => typeof x === "string" || typeof x === "number",
    );
    const pairs = livePairs.length
      ? livePairs.slice(0, 5)
      : [
          ["Total customers", "0"],
          ["KYC approved", "0"],
          ["Pending transactions", "0"],
          ["Funding value", "₦0.00"],
          ["Purchase value", "₦0.00"],
        ];
    return (
      <>
        <h1 className="text-2xl font-semibold">Overview</h1>
        <p className="mt-1 text-sm text-slate-500">
          Live operational data for your organisation.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {pairs.map(([k, v]) => (
            <div className="panel p-5" key={k}>
              <p className="text-sm capitalize text-slate-500">
                {k.replace(/([A-Z])/g, " $1")}
              </p>
              <b className="mt-5 block text-2xl">{String(v)}</b>
              <p className="mt-2 text-xs text-slate-400">No activity yet</p>
            </div>
          ))}
        </div>
        <div className="mt-6 grid gap-5 xl:grid-cols-3">
          <div className="panel xl:col-span-2">
            <div className="border-b border-[#eef0ec] p-5">
              <h2 className="text-sm font-semibold">Recent transactions</h2>
              <p className="mt-1 text-xs text-slate-500">Your latest funding and purchase activity.</p>
            </div>
            <div className="grid min-h-56 place-items-center p-6 text-center">
              <div>
                <Activity className="mx-auto mb-3 text-[#1c4f35]" size={22} />
                <p className="text-sm font-medium">No transactions yet</p>
                <p className="mt-1 text-xs text-slate-500">Transactions will appear here once your customers begin using Vestra.</p>
              </div>
            </div>
          </div>
          <div className="panel p-5">
            <h2 className="text-sm font-semibold">Transaction status</h2>
            <p className="mt-1 text-xs text-slate-500">Last 30 days</p>
            <div className="mt-6 space-y-4 text-sm">
              {[["Successful","0","bg-emerald-500"],["Pending","0","bg-amber-400"],["Failed","0","bg-slate-300"]].map(([label,value,color])=><div key={label} className="flex items-center justify-between"><span className="flex items-center gap-2 text-slate-600"><i className={`h-2 w-2 rounded-full ${color}`}/>{label}</span><b>{value}</b></div>)}
            </div>
          </div>
        </div>
      </>
    );
  }
  const rows = Array.isArray(data) ? data : data?.items || data?.data || [];
  return (
    <>
      <h1 className="text-2xl font-semibold">{tab}</h1>
      <p className="mt-1 text-sm text-slate-500">
        Live data for your organisation only.
      </p>
      {!rows.length ? (
        <EmptyPage tab={tab} />
      ) : (
        <div className="panel mt-6 overflow-x-auto">
          <table>
            <thead>
              <tr>
                {Object.keys(rows[0])
                  .slice(0, 7)
                  .map((k) => (
                    <th key={k}>{k}</th>
                  ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r: any, i: number) => (
                <tr key={r.id || i}>
                  {Object.keys(rows[0])
                    .slice(0, 7)
                    .map((k) => (
                      <td key={k}>
                        {typeof r[k] === "object"
                          ? JSON.stringify(r[k])
                          : String(r[k] ?? "—")}
                      </td>
                    ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
function EmptyPage({ tab }: { tab: string }) {
  const content: Record<string, [string, string, string]> = {
    Customers: ["No customers yet", "Create your first customer to begin onboarding and KYC.", "Add customer"],
    KYC: ["No KYC checks yet", "Customer verification requests will appear here once submitted.", "View customers"],
    "Wallet Funding": ["No wallet funding yet", "Funding instructions and payment status will appear here.", "Fund a wallet"],
    Purchases: ["No purchases yet", "Investment purchases for your customers will appear here.", "View products"],
    Transactions: ["No transactions yet", "Funding and investment transactions will appear here as activity begins.", "View customers"],
    "Product Catalogue": ["No products assigned yet", "Investment products available to your organisation will appear here.", "Refresh products"],
    Analytics: ["Your analytics will appear here", "Charts and trends become available once you begin processing activity.", "View overview"],
  };
  const [title, description, action] = content[tab] || ["Nothing to show yet", "Your organisation's activity will appear here.", "Go to overview"];
  return <div className="mt-6 grid gap-5 lg:grid-cols-3"><div className="panel lg:col-span-2"><div className="border-b border-[#eef0ec] p-5"><h2 className="text-sm font-semibold">{tab} activity</h2><p className="mt-1 text-xs text-slate-500">Everything for your organisation will be kept here.</p></div><div className="grid min-h-64 place-items-center p-6 text-center"><div><Package className="mx-auto mb-3 text-[#1c4f35]" size={24}/><p className="text-sm font-medium">{title}</p><p className="mx-auto mt-1 max-w-sm text-xs text-slate-500">{description}</p><button className="btn mt-5 bg-[#1c4f35] text-white"><Plus size={15}/>{action}</button></div></div></div><div className="space-y-4"><div className="panel p-5"><p className="text-xs font-semibold uppercase tracking-wider text-slate-500">At a glance</p><b className="mt-4 block text-3xl">0</b><p className="mt-1 text-xs text-slate-500">Total {tab.toLowerCase()}</p></div><div className="panel p-5"><p className="text-sm font-semibold">Getting started</p><p className="mt-2 text-xs leading-5 text-slate-500">Your data will update automatically as your organisation begins using the Vestra platform.</p></div></div></div>;
}
function Keys({
  data,
  token,
  organisation,
  reload,
}: {
  data: any;
  token: string;
  organisation: string;
  reload: () => void;
}) {
  const keys = Array.isArray(data) ? data : data?.items || [];
  const [name, setName] = useState(`${organisation} API key`),
    [raw, setRaw] = useState(""),
    [error, setError] = useState(""),
    [copiedKey, setCopiedKey] = useState("");
  const copy = async (value: string, keyId: string) => {
    await navigator.clipboard.writeText(value);
    setCopiedKey(keyId);
    window.setTimeout(() => setCopiedKey(""), 1800);
  };
  const mask = (value: string) =>
    value.length > 16 ? `${value.slice(0, 12)}••••${value.slice(-4)}` : value;
  return (
    <>
      <h1 className="text-2xl font-semibold">API keys</h1>
      <p className="mt-1 text-sm text-slate-500">
        Your backend only — never browser code.
      </p>
      <div className="mt-5 flex flex-wrap gap-2">
        <input
          aria-label="API key name"
          className="field max-w-sm"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button
          className="btn bg-[#1c4f35] text-white"
          onClick={async () => {
            try {
              setError("");
              const r = await portalApi.createKey(token, name);
              setRaw(r.key || r.rawKey || r.apiKey || r.value || "");
              setName(`${organisation} API key`);
              reload();
            } catch (e) {
              setError(
                e instanceof Error ? e.message : "Could not create API key.",
              );
            }
          }}
        >
          <Plus size={15} />
          Create key
        </button>
      </div>
      {raw && (
        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-md border border-[#cfe0d2] bg-[#eef6ef] p-3">
          <span className="text-xs font-semibold text-[#24563a]">New key:</span>
          <code className="min-w-0 flex-1 break-all rounded bg-white px-2 py-1 text-xs">
            {raw}
          </code>
          <button
            className={`btn ${copiedKey === "new" ? "border-emerald-300 bg-emerald-50 text-emerald-700" : ""}`}
            onClick={() => copy(raw, "new")}
          >
            {copiedKey === "new" ? <Check size={14} /> : <Copy size={14} />}
            {copiedKey === "new" ? "Copied" : "Copy key"}
          </button>
          <button className="text-xs text-slate-500" onClick={() => setRaw("")}>
            Dismiss
          </button>
        </div>
      )}
      {error && (
        <p className="mt-4 rounded-md bg-rose-50 p-3 text-sm text-rose-700">
          {error}
        </p>
      )}
      <div className="panel mt-6 overflow-x-auto">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Key</th>
              <th>Created</th>
              <th>Last used</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {keys.map((k: any) => {
              const keyId = k.id || k.apiKeyId || k._id;
              const value =
                k.key ||
                k.rawKey ||
                k.apiKey ||
                k.value ||
                k.maskedKey ||
                k.keyPrefix ||
                "";
              return (
                <tr key={keyId}>
                  <td>{k.name}</td>
                  <td className="font-mono text-xs">{value ? mask(value) : "—"}</td>
                  <td>{k.createdAt || "—"}</td>
                  <td>{k.lastUsedAt || "Never"}</td>
                  <td>
                    {value && (
                      <button
                        className={`btn ${copiedKey === keyId ? "border-emerald-300 bg-emerald-50 text-emerald-700" : ""}`}
                        onClick={() => copy(value, keyId)}
                      >
                        {copiedKey === keyId ? <Check size={14} /> : <Copy size={14} />}
                        {copiedKey === keyId ? "Copied" : "Copy"}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
function Modal({
  title,
  close,
  children,
}: {
  title: string;
  close: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[#102019]/40 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <div className="flex justify-between">
          <b>{title}</b>
          <button onClick={close}>
            <X size={18} />
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}
