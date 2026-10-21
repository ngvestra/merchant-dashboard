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
  Search,
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
  ["Developer Docs", FileKey],
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
    [confirmPass, setConfirmPass] = useState(""),
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
        if (pass !== confirmPass) {
          setMsg("Passwords do not match.");
          return;
        }
        await portalApi.reset(email, otp, pass, confirmPass);
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
          {mode === "reset" && (
            <input
              className="field"
              type="password"
              required
              placeholder="Confirm new password"
              value={confirmPass}
              onChange={(e) => setConfirmPass(e.target.value)}
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
      if (tab === "Overview") {
        const [customers, transactions, products] = await Promise.all([
          portalApi.customerMetrics(s.token),
          portalApi.transactionMetrics(s.token),
          portalApi.productMetrics(s.token),
        ]);
        setData({ customers, transactions, products });
        return;
      }
      if (tab === "Analytics") {
        const [customers, transactions, products] = await Promise.all([
          portalApi.customerMetrics(s.token),
          portalApi.transactionMetrics(s.token),
          portalApi.productMetrics(s.token),
        ]);
        setData({ customers, transactions, products });
        return;
      }
      const fn: any = tab === "Customers"
            ? portalApi.customers
            : tab === "KYC"
              ? portalApi.customers
              : tab === "Wallet Funding"
                ? (token: string) => portalApi.transactions(token, "&type=DEPOSIT")
                : tab === "Purchases"
                  ? (token: string) => portalApi.transactions(token, "&type=PURCHASE")
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
  if (tab === "Developer Docs") return <DeveloperDocs embedded />;
  if (tab === "Customers" || tab === "Transactions") return <RecordsTable tab={tab} data={data} />;
  if (tab === "KYC") return <KycPage data={data} />;
  if (tab === "Wallet Funding" || tab === "Purchases")
    return <TransactionActivityPage tab={tab} data={data} />;
  if (tab === "Analytics") return <AnalyticsPage data={data} />;
  if (tab === "Overview") {
    const customers = data?.customers || {};
    const transactions = data?.transactions || {};
    const transactionRows = transactions.transactions || [];
    const byStatus = (status: string) => transactionRows.filter((item: any) => item.status === status).reduce((sum: number, item: any) => sum + (item.count || 0), 0);
    const amountFor = (type: string) => transactionRows.filter((item: any) => item.type === type).reduce((sum: number, item: any) => sum + (item.amount || 0), 0);
    const volume = Object.entries(transactions.totalVolume || {}).map(([currency, amount]) => `${currency} ${Number(amount).toLocaleString()}`).join(" · ") || "₦0.00";
    const pairs = [
      ["Total customers", String(customers.total || 0)],
      ["KYC approved", String(customers.kyc?.APPROVED || 0)],
      ["KYC pending review", String(customers.kyc?.PENDING || 0)],
      ["Funding value", `₦${amountFor("DEPOSIT").toLocaleString()}`],
      ["Purchase value", `₦${amountFor("PURCHASE").toLocaleString()}`],
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
              <p className="mt-2 text-xs text-slate-400">{k === "Total customers" ? `${customers.kyc?.NOT_STARTED || 0} KYC not started · ${customers.kyc?.REJECTED || 0} rejected` : "Live merchant data"}</p>
            </div>
          ))}
        </div>
        <div className="mt-6 grid gap-5 xl:grid-cols-3">
          <div className="panel xl:col-span-2">
            <div className="border-b border-[#eef0ec] p-5">
              <h2 className="text-sm font-semibold">Recent transactions</h2>
              <p className="mt-1 text-xs text-slate-500">
                Your latest funding and purchase activity.
              </p>
            </div>
            <div className="grid min-h-56 place-items-center p-6 text-center">
              <div>
                <Activity className="mx-auto mb-3 text-[#1c4f35]" size={22} />
                <p className="text-sm font-medium">{transactions.totalTransactions || 0} total transactions</p>
                <p className="mt-1 text-xs text-slate-500">
                  {volume}
                </p>
              </div>
            </div>
          </div>
          <div className="panel p-5">
            <h2 className="text-sm font-semibold">Transaction status</h2>
            <p className="mt-1 text-xs text-slate-500">Last 30 days</p>
            <div className="mt-6 space-y-4 text-sm">
              {[
                ["Successful", String(byStatus("SUCCESS")), "bg-emerald-500"],
                ["Pending", String(byStatus("PENDING")), "bg-amber-400"],
                ["Failed", String(byStatus("FAILED") + byStatus("REVERSED")), "bg-slate-300"],
              ].map(([label, value, color]) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-slate-600">
                    <i className={`h-2 w-2 rounded-full ${color}`} />
                    {label}
                  </span>
                  <b>{value}</b>
                </div>
              ))}
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
const rowsOf = (data: any) =>
  Array.isArray(data)
    ? data
    : data?.items || data?.data?.data || data?.data || data?.customers || data?.transactions || [];
const StatusPill = ({ value }: { value?: string }) => {
  const state = value || "NOT_STARTED";
  const colour = ["APPROVED", "SUCCESS", "ISSUED"].includes(state)
    ? "bg-emerald-50 text-emerald-700"
    : ["PENDING", "PROCESSING", "NOT_STARTED"].includes(state)
      ? "bg-amber-50 text-amber-700"
      : "bg-rose-50 text-rose-700";
  return <span className={`inline-flex rounded-full px-2 py-1 text-[11px] font-semibold ${colour}`}>{state}</span>;
};
function KycPage({ data }: { data: any }) {
  const rows = rowsOf(data);
  const counts = ["APPROVED", "PENDING", "NOT_STARTED", "REJECTED"].map((status) => [status, rows.filter((row: any) => (row.kycStatus || "NOT_STARTED") === status).length]);
  return <><h1 className="text-2xl font-semibold">KYC</h1><p className="mt-1 text-sm text-slate-500">Live customer verification status for your organisation.</p><div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{counts.map(([status, count]) => <div className="panel p-5" key={String(status)}><StatusPill value={String(status)} /><b className="mt-4 block text-2xl">{count}</b><p className="mt-1 text-xs text-slate-500">customers</p></div>)}</div>{!rows.length ? <EmptyPage tab="KYC" /> : <div className="panel mt-6 overflow-x-auto"><table><thead><tr><th>Customer</th><th>Email</th><th>Customer ID</th><th>KYC status</th><th>Updated</th></tr></thead><tbody>{rows.map((row: any, index: number) => <tr key={row.customerId || row.id || index}><td>{[row.firstName, row.lastName].filter(Boolean).join(" ") || row.name || "—"}</td><td>{row.email || "—"}</td><td className="font-mono text-xs">{row.customerId || "—"}</td><td><StatusPill value={row.kycStatus} /></td><td>{row.updatedAt ? new Date(row.updatedAt).toLocaleDateString() : "—"}</td></tr>)}</tbody></table></div>}</>;
}
function TransactionActivityPage({ tab, data }: { tab: "Wallet Funding" | "Purchases"; data: any }) {
  const rows = rowsOf(data);
  const isFunding = tab === "Wallet Funding";
  const total = rows.reduce((sum: number, row: any) => sum + Number(row.amount || 0), 0);
  const successful = rows.filter((row: any) => row.status === "SUCCESS").length;
  return <><h1 className="text-2xl font-semibold">{tab}</h1><p className="mt-1 text-sm text-slate-500">Live {isFunding ? "wallet funding" : "product purchase"} activity for your organisation.</p><div className="mt-6 grid gap-4 sm:grid-cols-3"><div className="panel p-5"><p className="text-sm text-slate-500">Total transactions</p><b className="mt-4 block text-2xl">{rows.length}</b></div><div className="panel p-5"><p className="text-sm text-slate-500">Successful</p><b className="mt-4 block text-2xl">{successful}</b></div><div className="panel p-5"><p className="text-sm text-slate-500">Total value</p><b className="mt-4 block text-2xl">₦{total.toLocaleString()}</b></div></div>{!rows.length ? <EmptyPage tab={tab} /> : <div className="panel mt-6 overflow-x-auto"><table><thead><tr><th>Customer ID</th><th>Amount</th><th>Status</th><th>Reference</th><th>Created</th></tr></thead><tbody>{rows.map((row: any, index: number) => <tr key={row.id || index}><td className="font-mono text-xs">{row.customerId || "—"}</td><td>{row.currency || "NGN"} {Number(row.amount || 0).toLocaleString()}</td><td><StatusPill value={row.status} /></td><td className="font-mono text-xs">{row.merchantReference || row.reference || "—"}</td><td>{row.createdAt ? new Date(row.createdAt).toLocaleDateString() : "—"}</td></tr>)}</tbody></table></div>}</>;
}
function AnalyticsPage({ data }: { data: any }) {
  const customers = data?.customers || {}, transactions = data?.transactions || {}, products = rowsOf(data?.products);
  const activity = transactions.transactions || [];
  const number = (predicate: (row: any) => boolean) => activity.filter(predicate).reduce((sum: number, row: any) => sum + Number(row.count || 0), 0);
  return <><h1 className="text-2xl font-semibold">Analytics</h1><p className="mt-1 text-sm text-slate-500">Live, organisation-level performance metrics.</p><div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><div className="panel p-5"><p className="text-sm text-slate-500">Customers</p><b className="mt-4 block text-2xl">{customers.total || 0}</b><p className="mt-1 text-xs text-slate-500">{customers.kyc?.APPROVED || 0} KYC approved</p></div><div className="panel p-5"><p className="text-sm text-slate-500">Transactions</p><b className="mt-4 block text-2xl">{transactions.totalTransactions || 0}</b><p className="mt-1 text-xs text-slate-500">{number((row) => row.status === "SUCCESS")} successful</p></div><div className="panel p-5"><p className="text-sm text-slate-500">Transaction volume</p><b className="mt-4 block text-2xl">{Object.entries(transactions.totalVolume || {}).map(([currency, amount]) => `${currency} ${Number(amount).toLocaleString()}`).join(" · ") || "₦0"}</b><p className="mt-1 text-xs text-slate-500">Across all completed and pending activity</p></div><div className="panel p-5"><p className="text-sm text-slate-500">Product activity</p><b className="mt-4 block text-2xl">{products.reduce((sum: number, item: any) => sum + Number(item.count || 0), 0)}</b><p className="mt-1 text-xs text-slate-500">Purchase records by product</p></div></div><div className="panel mt-6 overflow-x-auto"><div className="border-b border-[#eef0ec] p-5"><h2 className="text-sm font-semibold">Transaction breakdown</h2><p className="mt-1 text-xs text-slate-500">Grouped live data from the transaction metrics endpoint.</p></div>{activity.length ? <table><thead><tr><th>Type</th><th>Status</th><th>Currency</th><th>Count</th><th>Amount</th></tr></thead><tbody>{activity.map((row: any, index: number) => <tr key={`${row.type}-${row.status}-${index}`}><td>{row.type}</td><td><StatusPill value={row.status} /></td><td>{row.currency}</td><td>{row.count}</td><td>{Number(row.amount || 0).toLocaleString()}</td></tr>)}</tbody></table> : <div className="p-8 text-center text-sm text-slate-500">No transaction activity yet. Metrics will populate here as customers use your service.</div>}</div></>;
}
function RecordsTable({ tab, data }: { tab: "Customers" | "Transactions"; data: any }) {
  const rows = Array.isArray(data) ? data : data?.items || data?.data || data?.customers || data?.transactions || [];
  const badge = (value: string) => <span className={`inline-flex rounded-full px-2 py-1 text-[11px] font-semibold ${["APPROVED","SUCCESS","ISSUED"].includes(value) ? "bg-emerald-50 text-emerald-700" : ["PENDING","PROCESSING","NOT_STARTED"].includes(value) ? "bg-amber-50 text-amber-700" : "bg-rose-50 text-rose-700"}`}>{value || "—"}</span>;
  return <><h1 className="text-2xl font-semibold">{tab}</h1><p className="mt-1 text-sm text-slate-500">Live data for your organisation only.</p>{!rows.length ? <EmptyPage tab={tab} /> : <div className="panel mt-6 overflow-x-auto"><table><thead><tr>{tab === "Customers" ? <><th>Customer</th><th>Phone</th><th>KYC status</th><th>Customer ID</th><th>Created</th></> : <><th>Type</th><th>Amount</th><th>Status</th><th>Reference</th><th>Customer ID</th><th>Product / receipt</th><th>Created</th></>}</tr></thead><tbody>{rows.map((row: any, index: number) => tab === "Customers" ? <tr key={row.customerId || row.id || index}><td><b>{[row.firstName,row.lastName].filter(Boolean).join(" ") || row.name || "—"}</b><span className="block text-xs text-slate-500">{row.email || "—"}</span></td><td>{row.phone || "—"}</td><td>{badge(row.kycStatus)}</td><td className="font-mono text-xs">{row.customerId || row.id || "—"}</td><td>{row.createdAt ? new Date(row.createdAt).toLocaleDateString() : "—"}</td></tr> : <tr key={row.id || index}><td>{row.type || "—"}</td><td>{row.currency || "NGN"} {Number(row.amount || 0).toLocaleString()}</td><td>{badge(row.status)}</td><td className="font-mono text-xs">{row.merchantReference || row.reference || "—"}</td><td className="font-mono text-xs">{row.customerId || "—"}</td><td><span>{row.productId || "—"}</span><span className="block text-xs text-slate-500">{row.receiptStatus || ""}</span></td><td>{row.createdAt ? new Date(row.createdAt).toLocaleDateString() : "—"}</td></tr>)}</tbody></table></div>}</>;
}
function EmptyPage({ tab }: { tab: string }) {
  const content: Record<string, [string, string, string]> = {
    Customers: [
      "No customers yet",
      "Create your first customer to begin onboarding and KYC.",
      "Add customer",
    ],
    KYC: [
      "No KYC checks yet",
      "Customer verification requests will appear here once submitted.",
      "View customers",
    ],
    "Wallet Funding": [
      "No wallet funding yet",
      "Funding instructions and payment status will appear here.",
      "Fund a wallet",
    ],
    Purchases: [
      "No purchases yet",
      "Investment purchases for your customers will appear here.",
      "View products",
    ],
    Transactions: [
      "No transactions yet",
      "Funding and investment transactions will appear here as activity begins.",
      "View customers",
    ],
    "Product Catalogue": [
      "No products assigned yet",
      "Investment products available to your organisation will appear here.",
      "Refresh products",
    ],
    Analytics: [
      "Your analytics will appear here",
      "Charts and trends become available once you begin processing activity.",
      "View overview",
    ],
  };
  const [title, description, action] = content[tab] || [
    "Nothing to show yet",
    "Your organisation's activity will appear here.",
    "Go to overview",
  ];
  return (
    <div className="mt-6 grid gap-5 lg:grid-cols-3">
      <div className="panel lg:col-span-2">
        <div className="border-b border-[#eef0ec] p-5">
          <h2 className="text-sm font-semibold">{tab} activity</h2>
          <p className="mt-1 text-xs text-slate-500">
            Everything for your organisation will be kept here.
          </p>
        </div>
        <div className="grid min-h-64 place-items-center p-6 text-center">
          <div>
            <Package className="mx-auto mb-3 text-[#1c4f35]" size={24} />
            <p className="text-sm font-medium">{title}</p>
            <p className="mx-auto mt-1 max-w-sm text-xs text-slate-500">
              {description}
            </p>
            <button className="btn mt-5 bg-[#1c4f35] text-white">
              <Plus size={15} />
              {action}
            </button>
          </div>
        </div>
      </div>
      <div className="space-y-4">
        <div className="panel p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            At a glance
          </p>
          <b className="mt-4 block text-3xl">0</b>
          <p className="mt-1 text-xs text-slate-500">
            Total {tab.toLowerCase()}
          </p>
        </div>
        <div className="panel p-5">
          <p className="text-sm font-semibold">Getting started</p>
          <p className="mt-2 text-xs leading-5 text-slate-500">
            Your data will update automatically as your organisation begins
            using the Vestra platform.
          </p>
        </div>
      </div>
    </div>
  );
}
const DOC_BASE =
  "https://vestra-server-s44md.ondigitalocean.app/api/merchant/v1";
const DOC_ENDPOINTS = [
  [
    "create-customer",
    "POST",
    "/customers",
    "Create Customer",
    "Creates a merchant-scoped customer and returns a public customerId beginning with vmc_.",
  ],
  [
    "get-customer",
    "GET",
    "/customers/{customerId}",
    "Get Customer",
    "customerId is your merchant external customer ID.",
  ],
  [
    "verify-customer-bvn",
    "POST",
    "/customers/{customerId}/kyc/bvn",
    "Verify Customer BVN",
    "Submit BVN only from a secure backend. Never log it.",
  ],
  [
    "products",
    "GET",
    "/products",
    "List Available Investment Products",
    "Use the returned product id when creating a purchase.",
  ],
  [
    "fund-customer-wallet",
    "POST",
    "/customers/{customerId}/wallet/fund",
    "Initiate Customer Wallet Funding",
    "KYC must be approved. Use a unique Idempotency-Key.",
  ],
  ["wallet-balance", "GET", "/customers/{customerId}/wallet/balance", "Get Customer Wallet Balance", "Returns balances by currency for the public vmc customer ID."],
  [
    "place-investment-order",
    "POST",
    "/customers/{customerId}/products/{productId}/purchases",
    "Place Customer Investment Order",
    "KYC approval and sufficient wallet funds are required.",
  ],
  [
    "transactions",
    "GET",
    "/transactions",
    "List Merchant Transactions",
    "Filter by customerId, status, type, page and limit.",
  ],
  [
    "transaction-status",
    "GET",
    "/transactions/{transactionId}",
    "Get Transaction Status",
    "Track PENDING until a terminal status is returned.",
  ],
  ["investments", "GET", "/customers/{customerId}/investments", "Get Customer Investments", "Returns product holdings for the public vmc customer ID."],
  ["metrics-customers", "GET", "/metrics/customers", "Get Customer Metrics", "Returns customer total and KYC status counts."],
  ["metrics-transactions", "GET", "/metrics/transactions", "Get Transaction Metrics", "Returns transaction counts, status totals and volume by currency."],
  ["metrics-products", "GET", "/metrics/products", "Get Product Metrics", "Returns product purchase count, value and status."],
] as const;
type DocDetail = {
  path: string;
  request?: Record<string, unknown>;
  response: Record<string, unknown>;
  params?: string;
  note?: string;
  errors: string[];
};
const DOC_DETAILS: Record<string, DocDetail> = {
  "create-customer": { path: "/customers", request: { email: "customer@example.com", phone: "08012345678", firstName: "Ada", lastName: "Okafor", dob: "1990-01-15", sex: "female", homeAddress: "1 Marina Road", city: "Lagos", state: "Lagos", country: "Nigeria" }, response: { success: true, message: "Merchant customer created successfully", data: { customerId: "vmc_a1b2c3d4e5f6", kycStatus: "NOT_STARTED" } }, note: "Returns 201 Created. If the same customer already exists, Vestra returns 200 with “Merchant customer already exists”. Store and use only customerId (vmc_...).", errors: ["400 invalid customer details", "401 missing or invalid API key", "409 duplicate request", "500 temporary server error"] },
  "get-customer": { path: "/customers/vmc_a1b2c3d4e5f6", params: "Path: customerId — the public vmc_ customer ID you stored when creating the customer.", response: { success: true, message: "Merchant customer returned", data: { customerId: "vmc_a1b2c3d4e5f6", email: "customer@example.com", phone: "08012345678", firstName: "Ada", lastName: "Okafor", kycStatus: "APPROVED", status: "ACTIVE", createdAt: "2026-10-21T07:00:00.000Z", updatedAt: "2026-10-21T07:00:00.000Z" } }, errors: ["401 missing or invalid API key", "404 customer not found", "500 temporary server error"] },
  "verify-customer-bvn": { path: "/customers/vmc_a1b2c3d4e5f6/kyc/bvn", request: { bvn: "12345678901" }, params: "Path: customerId — the public vmc_ customer ID.", response: { success: true, message: "Customer KYC processed", data: { kycStatus: "APPROVED", verification: { status: "BVN_NAME_MATCHED", message: "Identity names match the Vestra profile.", verifiedAt: "2026-10-21T07:00:00.000Z", name: "Ada Ngozi Okafor" } } }, note: "KYC statuses are NOT_STARTED, PENDING, APPROVED, and REJECTED. Submit identity data only from your secure backend and never log it.", errors: ["400 invalid KYC request", "401 missing or invalid API key", "404 customer not found", "500 temporary server error"] },
  products: { path: "/products", response: { success: true, message: "Merchant products returned", data: [{ id: "67abc123def4567890abcd12", name: "Dangote Petroleum Refinery IPO", symbol: "DPRI", currency: "NGN", minimumUnits: 10 }] }, note: "Use id as productId when creating a purchase. Product availability can change, so fetch this list before purchase flows.", errors: ["401 missing or invalid API key", "500 temporary server error"] },
  "fund-customer-wallet": { path: "/customers/vmc_a1b2c3d4e5f6/wallet/fund", request: { amount: 1000, currency: "NGN", merchantReference: "ACME-DEP-001" }, params: "Path: customerId — the public vmc_ customer ID. Header: Idempotency-Key: unique-merchant-funding-reference.", response: { success: true, message: "Wallet funding initiated", data: { replayed: false, transaction: { id: "transaction-id", customerId: "vmc_a1b2c3d4e5f6", amount: 1000, currency: "NGN", type: "DEPOSIT", status: "PENDING", reference: "VESTRA_MERCHANT_FUND_...", merchantReference: "ACME-DEP-001", productId: null, receiptStatus: null }, funding: { paymentMethod: "bank_transfer", amountToPay: 1015, totalCharge: 1015, virtualAccount: { bankName: "Bank Name", accountNumber: "0123456789", amount: "1015.00", expiresAt: "2026-10-21 12:00:00" } } } }, note: "Use one unique Idempotency-Key for each funding operation. The customer must transfer the exact amountToPay, not just the requested amount.", errors: ["400 invalid amount or currency", "401 missing or invalid API key", "403 customer KYC is required", "404 customer not found", "409 idempotency key conflict", "500 temporary server error"] },
  "wallet-balance": { path: "/customers/vmc_a1b2c3d4e5f6/wallet/balance", params: "Path: customerId — the public vmc_ customer ID.", response: { success: true, message: "Customer wallet balance returned", data: { customerId: "vmc_a1b2c3d4e5f6", balances: [{ currency: "NGN", amount: 5400 }] } }, errors: ["401 missing or invalid API key", "404 customer not found", "500 temporary server error"] },
  "place-investment-order": { path: "/customers/vmc_a1b2c3d4e5f6/products/67abc123def4567890abcd12/purchases", request: { units: 10, merchantReference: "ACME-BUY-001" }, params: "Path: customerId — public vmc_ ID; productId — product id from GET /products. Header: Idempotency-Key: unique-merchant-purchase-reference.", response: { success: true, message: "Purchase order submitted", data: { replayed: false, transaction: { id: "transaction-id", customerId: "vmc_a1b2c3d4e5f6", amount: 5250, currency: "NGN", type: "PURCHASE", status: "PENDING", reference: "VESTRA_MERCHANT_BUY_...", merchantReference: "ACME-BUY-001", productId: "67abc123def4567890abcd12", receiptStatus: null } } }, note: "Use a unique Idempotency-Key for each purchase. The initial result can be PENDING; check the transaction until it reaches a terminal status.", errors: ["400 insufficient balance or invalid units", "401 missing or invalid API key", "403 customer KYC is required", "404 customer or product not found", "409 idempotency key conflict", "500 temporary server error"] },
  transactions: { path: "/transactions?customerId=vmc_a1b2c3d4e5f6&page=1&limit=25", params: "Optional query: customerId, status (PENDING | SUCCESS | FAILED | REVERSED), type (DEPOSIT | PURCHASE), page, limit.", response: { success: true, message: "Customer transactions returned", data: { page: 1, limit: 25, total: 3, data: [{ id: "transaction-id", customerId: "vmc_a1b2c3d4e5f6", amount: 5250, currency: "NGN", type: "PURCHASE", status: "SUCCESS", reference: "VESTRA_MERCHANT_BUY_...", merchantReference: "ACME-BUY-001", productId: "67abc123def4567890abcd12", receiptStatus: "ISSUED" }] } }, errors: ["400 invalid query parameters", "401 missing or invalid API key", "500 temporary server error"] },
  "transaction-status": { path: "/transactions/transaction-id", params: "Path: transactionId — the id returned when funding or purchasing.", response: { success: true, message: "Merchant transaction returned", data: { id: "transaction-id", customerId: "vmc_a1b2c3d4e5f6", amount: 5250, currency: "NGN", type: "PURCHASE", status: "SUCCESS", reference: "VESTRA_MERCHANT_BUY_...", merchantReference: "ACME-BUY-001", productId: "67abc123def4567890abcd12", receiptStatus: "ISSUED", createdAt: "2026-10-21T07:00:00.000Z", updatedAt: "2026-10-21T07:02:00.000Z" } }, note: "Transaction status: PENDING, SUCCESS, FAILED, REVERSED. Purchase receipt status: PROCESSING, ISSUED, FAILED.", errors: ["401 missing or invalid API key", "404 transaction not found", "500 temporary server error"] },
  investments: { path: "/customers/vmc_a1b2c3d4e5f6/investments", params: "Path: customerId — the public vmc_ customer ID.", response: { success: true, message: "Customer investments returned", data: { customerId: "vmc_a1b2c3d4e5f6", investments: [{ productId: "67abc123def4567890abcd12", name: "Dangote Petroleum Refinery IPO", symbol: "DPRI", currency: "NGN", investmentType: "Equity", investmentCategory: "Stocks", units: 10, unitPrice: 525, value: 5250 }] } }, errors: ["401 missing or invalid API key", "404 customer not found", "500 temporary server error"] },
  "metrics-customers": { path: "/metrics/customers", response: { success: true, message: "Customer metrics returned", data: { total: 1, kyc: { APPROVED: 1 } } }, errors: ["401 missing or invalid API key", "500 temporary server error"] },
  "metrics-transactions": { path: "/metrics/transactions", response: { success: true, message: "Transaction metrics returned", data: { totalTransactions: 3, totalVolume: { NGN: 10650 }, transactions: [{ type: "DEPOSIT", status: "SUCCESS", currency: "NGN", count: 2, amount: 5400 }, { type: "PURCHASE", status: "SUCCESS", currency: "NGN", count: 1, amount: 5250 }] } }, errors: ["401 missing or invalid API key", "500 temporary server error"] },
  "metrics-products": { path: "/metrics/products", response: { success: true, message: "Product metrics returned", data: [{ productId: "67abc123def4567890abcd12", status: "SUCCESS", count: 1, amount: 5250 }] }, errors: ["401 missing or invalid API key", "500 temporary server error"] },
};
const json = (value: unknown) => JSON.stringify(value, null, 2);
function endpointCode(method: string, detail: DocDetail, language: "curl" | "node") {
  const body = detail.request ? json(detail.request) : undefined;
  const key = detail.path.includes("/wallet/fund") || detail.path.includes("/purchases")
    ? "unique-merchant-operation-reference" : undefined;
  if (language === "curl") {
    return [`curl --request ${method} "$BASE_URL${detail.path}"`, "  --header \"x-api-key: $API_KEY\"", ...(key ? [`  --header "Idempotency-Key: ${key}"`] : []), ...(body ? ["  --header \"Content-Type: application/json\"", `  --data '${body}'`] : [])].join(" \\\n");
  }
  return `const response = await request("${detail.path}", {\n  method: "${method}",${key ? `\n  headers: { "Idempotency-Key": "${key}" },` : ""}${body ? `\n  body: JSON.stringify(${body}),` : ""}\n});\n\nconst result = await response.json();\nif (!response.ok) throw new Error(result.message);\nconsole.log(result);`;
}
export function DeveloperDocs({ embedded = false }: { embedded?: boolean }) {
  const [query, setQuery] = useState("");
  const [language, setLanguage] = useState<"curl" | "node">("curl");
  const [copied, setCopied] = useState("");
  const copy = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(id);
    window.setTimeout(() => setCopied(""), 1500);
  };
  const shown = DOC_ENDPOINTS.filter(([, method, path, title]) =>
    `${method} ${path} ${title}`.toLowerCase().includes(query.toLowerCase()),
  );
  const requestBody = JSON.stringify(
    {
      email: "customer@example.com",
      phone: "08012345678",
      firstName: "Ada",
      lastName: "Okafor",
      dob: "1990-01-15",
      sex: "female",
      homeAddress: "1 Marina Road",
      city: "Lagos",
      state: "Lagos",
      country: "Nigeria",
    },
    null,
    2,
  );
  const code =
    language === "curl"
      ? `curl --request POST \\\n+  '${DOC_BASE}/customers' \\\n+  --header 'Content-Type: application/json' \\\n+  --header 'x-api-key: vstr_live_your_merchant_api_key' \\\n+  --data '${requestBody}'`
      : `const response = await fetch(\`${DOC_BASE}/customers\`, {\n  method: 'POST',\n  headers: {\n    'Content-Type': 'application/json',\n    'x-api-key': process.env.VESTRA_MERCHANT_API_KEY,\n  },\n  body: JSON.stringify(customer),\n});\n\nconst result = await response.json();`;
  return (
    <div className={`${embedded ? "-m-5 lg:-m-8" : "min-h-screen"} bg-[#fbfcfa]`}>
      <div className="border-b border-[#e5e9e3] bg-white px-5 py-7 lg:px-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[#1c4f35]">
              Developer Docs
            </p>
            <h1 className="mt-2 text-3xl font-semibold">Vestra Merchant API</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Create and manage customers, complete KYC, fund wallets, place
              investment orders, track transactions, and review your merchant
              activity.
            </p>
          </div>
          {!embedded && (
            <a href="/" className="btn bg-[#1c4f35] text-white">
              Log in to portal
            </a>
          )}
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-3 rounded-md border border-[#d9e6db] bg-[#f1f8f2] p-3">
          <span className="text-xs font-semibold text-[#24563a]">Base URL</span>
          <code className="min-w-0 flex-1 break-all text-xs text-[#173f2b]">
            {DOC_BASE}
          </code>
          <button className="btn" onClick={() => copy(DOC_BASE, "base")}>
            {copied === "base" ? <Check size={14} /> : <Copy size={14} />}{" "}
            {copied === "base" ? "Copied" : "Copy"}
          </button>
        </div>
      </div>
      <div className="grid min-w-0 xl:grid-cols-[270px_minmax(0,1fr)_190px]">
        <aside className="min-w-0 overflow-x-hidden border-r border-[#e5e9e3] bg-white p-5 xl:sticky xl:top-0 xl:h-screen xl:overflow-y-auto">
          <div className="relative">
            <Search
              size={15}
              className="absolute left-3 top-2.5 text-slate-400"
            />
            <input
              className="field pl-9"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search docs"
            />
          </div>
          <p className="mt-7 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            API Documentation
          </p>
          <a className="mt-3 block rounded-md bg-[#edf5ef] px-3 py-2 text-sm font-medium text-[#1c4f35]" href="#overview">
            Overview
          </a>
          <a
            className="mt-1 block rounded-md px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
            href="#authentication"
          >
            Authentication
          </a>
          {shown.map(([id, method, path]) => (
            <a
              key={id}
              href={`#${id}`}
              title={`${method} ${path}`}
              className="mt-1 flex min-w-0 items-center gap-2 rounded-md px-3 py-2 text-xs text-slate-600 hover:bg-slate-50"
            >
              <span
                className={
                  method === "GET"
                    ? "shrink-0 font-semibold text-emerald-700"
                    : "shrink-0 font-semibold text-blue-700"
                }
              >
                {method}
              </span>
              <span className="truncate">{path}</span>
            </a>
          ))}
          <a className="mt-5 block rounded-md px-3 py-2 text-sm text-slate-600 hover:bg-slate-50" href="#errors">
            Error reference
          </a>
        </aside>
        <article className="min-w-0 space-y-12 p-6 lg:p-10">
          <section id="overview">
            <h2 className="text-2xl font-semibold">Overview</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              The Merchant API is designed for server-to-server integrations.
              Keep credentials exclusively in your merchant backend environment
              variables.
            </p>
            <div className="mt-5 rounded-md border-l-4 border-amber-400 bg-amber-50 p-4 text-sm text-amber-900">
              <b>Security notice.</b> Never use your API key in browser, mobile,
              or frontend code. Store it only in your merchant backend
              environment variables.
            </div>
          </section>
          <section id="authentication">
            <h2 className="text-2xl font-semibold">Authentication</h2>
            <p className="mt-3 text-sm text-slate-600">
              Every request requires{" "}
              <code className="rounded bg-slate-100 px-1">
                x-api-key: vstr_live_your_merchant_api_key
              </code>
              . Create it under API Keys in this portal; treat the visible raw
              key as a secret.
            </p>
            <CodeTabs
              language={language}
              setLanguage={setLanguage}
              code={
                language === "curl"
                  ? `curl --request GET \\\n  '${DOC_BASE}/products' \\\n  --header 'x-api-key: vstr_live_your_merchant_api_key'`
                  : `const response = await fetch('${DOC_BASE}/products', {\n  headers: { 'x-api-key': process.env.VESTRA_MERCHANT_API_KEY },\n});\nconst result = await response.json();`
              }
              id="auth"
              copy={copy}
              copied={copied}
            />
          </section>
          <section>
            <h2 className="text-2xl font-semibold">Standard API response</h2>
            <p className="mt-3 text-sm text-slate-600">
              Use both the HTTP status and{" "}
              <code className="rounded bg-slate-100 px-1">code</code> field for
              robust error handling.
            </p>
            <CodeTabs
              language={language}
              setLanguage={setLanguage}
              code={JSON.stringify(
                {
                  success: true,
                  message: "Human-readable result message",
                  data: {},
                },
                null,
                2,
              )}
              id="response"
              copy={copy}
              copied={copied}
            />
          </section>
          <section id="quick-start" className="border-t border-[#e8ece7] pt-9">
            <h2 className="text-2xl font-semibold">Shared setup</h2>
            <p className="mt-3 text-sm text-slate-600">Set these values once in your secure merchant backend, then use the examples below.</p>
            <CodeTabs language={language} setLanguage={setLanguage} code={language === "curl" ? `BASE_URL="${DOC_BASE}"\nAPI_KEY="vstr_live_your_api_key"` : `const baseUrl = "${DOC_BASE}";\nconst apiKey = process.env.VESTRA_API_KEY;\n\nconst request = (path, options = {}) =>\n  fetch(\`${"${baseUrl}"}\${path}\`, {\n    ...options,\n    headers: {\n      "x-api-key": apiKey,\n      "Content-Type": "application/json",\n      ...(options.headers ?? {}),\n    },\n  });`} id="setup" copy={copy} copied={copied} />
          </section>
          {shown.map(([id, method, path, title, description]) => {
            const detail = DOC_DETAILS[id];
            const code = endpointCode(method, detail, language);
            return <section id={id} key={id} className="scroll-mt-6 border-t border-[#e8ece7] pt-9">
              <div className="flex flex-wrap items-center gap-3">
                <span
                  className={
                    method === "GET"
                      ? "rounded px-2 py-1 text-xs font-bold bg-emerald-50 text-emerald-700"
                      : "rounded px-2 py-1 text-xs font-bold bg-blue-50 text-blue-700"
                  }
                >
                  {method}
                </span>
                <code className="text-sm">{path}</code>
                <button
                  className="btn ml-auto"
                  onClick={() => copy(`${DOC_BASE}${path}`, id)}
                >
                  {copied === id ? <Check size={14} /> : <Copy size={14} />}{" "}
                  {copied === id ? "Copied" : "Copy URL"}
                </button>
              </div>
              <h2 className="mt-4 text-xl font-semibold">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {description}
              </p>
              <div className="mt-4 rounded-md bg-slate-50 p-4 text-xs leading-5 text-slate-700"><b>Authentication & headers.</b> Send <code>x-api-key: &lt;merchant-api-key&gt;</code> on every request.{detail.params && <p className="mt-2">{detail.params}</p>}</div>
              {detail.note && <div className="mt-4 rounded-md bg-blue-50 p-4 text-xs leading-5 text-blue-900">{detail.note}</div>}
              {detail.request && <DocJson title="Request body" value={json(detail.request)} id={`${id}-request`} copy={copy} copied={copied} />}
              <DocJson title="Success response" value={json(detail.response)} id={`${id}-response`} copy={copy} copied={copied} />
              <h3 className="mt-5 text-sm font-semibold">Common errors</h3>
              <div className="mt-2 flex flex-wrap gap-2">{detail.errors.map((error) => <span key={error} className="rounded bg-rose-50 px-2 py-1 text-xs text-rose-700">{error}</span>)}</div>
              <CodeTabs language={language} setLanguage={setLanguage} code={code} id={`${id}-example`} copy={copy} copied={copied} />
            </section>;
          })}
          <section id="errors" className="border-t border-[#e8ece7] pt-9">
            <h2 className="text-2xl font-semibold">Error reference</h2>
            <div className="mt-4 overflow-x-auto">
              <table>
                <thead>
                  <tr>
                    <th>HTTP</th>
                    <th>Code</th>
                    <th>Suggested action</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    [
                      "401",
                      "MERCHANT_API_KEY_REQUIRED",
                      "Send x-api-key from your backend.",
                    ],
                    [
                      "401",
                      "MERCHANT_API_KEY_INVALID",
                      "Check or replace the key.",
                    ],
                    [
                      "403",
                      "MERCHANT_CUSTOMER_KYC_REQUIRED",
                      "Complete KYC before funding or investing.",
                    ],
                    [
                      "404",
                      "MERCHANT_CUSTOMER_NOT_FOUND",
                      "Check the external customer ID.",
                    ],
                    [
                      "404",
                      "MERCHANT_PRODUCT_NOT_FOUND",
                      "Refresh available products.",
                    ],
                    [
                      "409",
                      "IDEMPOTENCY_KEY_REUSED",
                      "Reuse only for the same operation.",
                    ],
                    [
                      "400",
                      "INSUFFICIENT_WALLET_BALANCE",
                      "Fund the customer wallet first.",
                    ],
                    [
                      "400",
                      "MERCHANT_PRODUCT_MINIMUM_UNITS",
                      "Meet the product minimum.",
                    ],
                  ].map((row) => (
                    <tr key={row[1]}>
                      {row.map((cell) => (
                        <td key={cell}>{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <details className="mt-4 rounded-md border border-[#e5e9e3] p-4 text-sm text-slate-600">
              <summary className="cursor-pointer font-medium text-[#17251d]">
                5xx responses
              </summary>
              <p className="mt-3">
                Retry safely using the same Idempotency-Key for funding and
                purchase requests.
              </p>
            </details>
          </section>
          <section>
            <h2 className="text-2xl font-semibold">Integration flow</h2>
            <ol className="mt-5 grid gap-3 sm:grid-cols-3">
              {[
                "Create customer",
                "Submit customer KYC",
                "Confirm KYC is APPROVED",
                "Fetch available products",
                "Initiate wallet funding",
                "Check transaction status until funding is successful",
                "Buy a product",
                "Check transaction status until purchase is successful",
                "Fetch investments",
                "Use transaction history and split metrics endpoints for reporting",
              ].map((step, index) => (
                <li
                  key={step}
                  className="rounded-md border border-[#e5e9e3] bg-white p-4 text-sm"
                >
                  <span className="mb-2 grid h-6 w-6 place-items-center rounded-full bg-[#e9f3eb] text-xs font-bold text-[#1c4f35]">
                    {index + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </section>
        </article>
        <aside className="hidden border-l border-[#e5e9e3] bg-white p-5 xl:sticky xl:top-0 xl:block xl:h-screen">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            On this page
          </p>
          <a href="#overview" className="mt-4 block text-xs text-slate-600">
            Overview
          </a>
          <a
            href="#authentication"
            className="mt-3 block text-xs text-slate-600"
          >
            Authentication
          </a>
          <a
            href="#create-customer"
            className="mt-3 block text-xs text-slate-600"
          >
            Create customer
          </a>
          <a
            href="#fund-customer-wallet"
            className="mt-3 block text-xs text-slate-600"
          >
            Fund wallet
          </a>
          <a href="#errors" className="mt-3 block text-xs text-slate-600">
            Errors
          </a>
        </aside>
      </div>
    </div>
  );
}
function CodeTabs({
  language,
  setLanguage,
  code,
  id,
  copy,
  copied,
}: {
  language: "curl" | "node";
  setLanguage: (value: "curl" | "node") => void;
  code: string;
  id: string;
  copy: (text: string, id: string) => void;
  copied: string;
}) {
  return (
    <div className="mt-5 overflow-hidden rounded-md border border-[#20382c]">
      <div className="flex items-center justify-between bg-[#173427] px-3 py-2">
        <div className="flex gap-1">
          <button
            onClick={() => setLanguage("curl")}
            className={`rounded px-2 py-1 text-xs ${language === "curl" ? "bg-white/15 text-white" : "text-slate-300"}`}
          >
            cURL
          </button>
          <button
            onClick={() => setLanguage("node")}
            className={`rounded px-2 py-1 text-xs ${language === "node" ? "bg-white/15 text-white" : "text-slate-300"}`}
          >
            Node.js
          </button>
        </div>
        <button
          className="btn border-white/20 bg-transparent text-white"
          onClick={() => copy(code, id)}
        >
          {copied === id ? <Check size={14} /> : <Copy size={14} />}{" "}
          {copied === id ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto bg-[#10261b] p-4 text-xs leading-6 text-[#dcefe0]">
        {code}
      </pre>
    </div>
  );
}
function DocJson({
  title,
  value,
  id,
  copy,
  copied,
}: {
  title: string;
  value: string;
  id: string;
  copy: (text: string, id: string) => void;
  copied: string;
}) {
  return (
    <div className="mt-5 overflow-hidden rounded-md border border-[#dfe7df] bg-white">
      <div className="flex items-center justify-between border-b border-[#e5e9e3] px-3 py-2">
        <p className="text-xs font-semibold text-slate-700">{title}</p>
        <button className="btn" onClick={() => copy(value, id)}>
          {copied === id ? <Check size={14} /> : <Copy size={14} />} {copied === id ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 text-xs leading-6 text-slate-700">{value}</pre>
    </div>
  );
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
                  <td className="font-mono text-xs">
                    {value ? mask(value) : "—"}
                  </td>
                  <td>{k.createdAt || "—"}</td>
                  <td>{k.lastUsedAt || "Never"}</td>
                  <td>
                    {value && (
                      <button
                        className={`btn ${copiedKey === keyId ? "border-emerald-300 bg-emerald-50 text-emerald-700" : ""}`}
                        onClick={() => copy(value, keyId)}
                      >
                        {copiedKey === keyId ? (
                          <Check size={14} />
                        ) : (
                          <Copy size={14} />
                        )}
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
