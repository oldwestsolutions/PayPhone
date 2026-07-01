import { useCallback, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { PhoneIcon } from "./components/PhoneIcon";
import { MainShell } from "./panels/MainShell";
import type { AppSection, BillingStatus, Invoice, UserAccount } from "./types";
import "./App.css";

type Phase = "splash" | "auth" | "paywall" | "app";

function SplashScreen({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 1800);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div className="splash">
      <PhoneIcon size={56} className="splash-bell" />
      <h1>Payphone</h1>
      <p>Call · Pay · Ship</p>
    </div>
  );
}

function AuthScreen({ onSuccess }: { onSuccess: (u: UserAccount) => void }) {
  const [mode, setMode] = useState<"login" | "register">("register");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      if (mode === "register") {
        await invoke("register_account", { username, email, password, phone });
        onSuccess(
          await invoke<UserAccount>("login_account", { email, password })
        );
      } else {
        onSuccess(await invoke<UserAccount>("login_account", { email, password }));
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-screen">
      <form className="auth-card" onSubmit={handleSubmit}>
        <PhoneIcon size={40} className="auth-bell" />
        <h1>{mode === "login" ? "Sign in" : "Create account"}</h1>
        <p className="hint">
          Register at payphone.cc with email and phone. Only verified accounts can place calls and move USDC.
        </p>
        <div className="auth-tabs">
          <button type="button" className={mode === "login" ? "active" : ""} onClick={() => setMode("login")}>
            Log in
          </button>
          <button type="button" className={mode === "register" ? "active" : ""} onClick={() => setMode("register")}>
            Register
          </button>
        </div>
        {mode === "register" && (
          <>
            <label>
              Stellar username (7–22 chars, include a number)
              <input value={username} onChange={(e) => setUsername(e.target.value)} required />
            </label>
            <label>
              Mobile number
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1..." required />
            </label>
          </>
        )}
        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          Password
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required />
        </label>
        {error && <p className="error">{error}</p>}
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? "…" : "Continue"}
        </button>
      </form>
    </div>
  );
}

function PaywallScreen({ user, onActivated }: { user: UserAccount; onActivated: (u: UserAccount) => void }) {
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [billing, setBilling] = useState<BillingStatus | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const b = await invoke<BillingStatus>("get_billing_status");
      setBilling(b);
      if (b.btcpay_configured) {
        setInvoice(await invoke<Invoice>("create_storage_invoice"));
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <h1>Activate storage ($9.99/mo)</h1>
        <p>@{user.username} — unlock contacts, call history, and masked calling</p>
        {billing?.btcpay_configured ? (
          <>
            {invoice && <p className="invoice-amt">${invoice.amount} BTC</p>}
            {invoice && (
              <button type="button" className="btn-primary" onClick={() => invoke("open_url", { url: invoice.checkout_link })}>
                Pay with Bitcoin (BTCPay)
              </button>
            )}
            <p className="hint">Storage activates automatically when BTCPay confirms payment. You can also verify manually below.</p>
            {invoice && (
              <button
                type="button"
                className="btn-secondary"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    onActivated(await invoke<UserAccount>("verify_and_activate_storage", { invoiceId: invoice.id }));
                  } catch (e) {
                    setError(String(e));
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Verify payment
              </button>
            )}
          </>
        ) : (
          <p className="hint">Configure PAYPHONE_BTCPAY_* in .env for live Bitcoin billing.</p>
        )}
        {error && <p className="error">{error}</p>}
      </div>
    </div>
  );
}

export default function App() {
  const [phase, setPhase] = useState<Phase>("splash");
  const [user, setUser] = useState<UserAccount | null>(null);
  const [section, setSection] = useState<AppSection>("communications");

  function afterSplash() {
    invoke<UserAccount | null>("get_session")
      .then((s) => {
        if (!s?.access_token && !s?.username) {
          setPhase("auth");
          return;
        }
        if (!s) {
          setPhase("auth");
          return;
        }
        setUser(s as UserAccount);
        setPhase(s.storage_paid ? "app" : "paywall");
      })
      .catch(() => setPhase("auth"));
  }

  async function logout() {
    await invoke("logout");
    setUser(null);
    setPhase("auth");
  }

  if (phase === "splash") return <SplashScreen onDone={afterSplash} />;
  if (phase === "auth")
    return (
      <AuthScreen
        onSuccess={(u) => {
          setUser(u);
          setSection("communications");
          setPhase(u.storage_paid ? "app" : "paywall");
        }}
      />
    );
  if (phase === "paywall" && user)
    return (
      <PaywallScreen
        user={user}
        onActivated={(u) => {
          setUser(u);
          setSection("communications");
          setPhase("app");
        }}
      />
    );
  if (phase === "app" && user)
    return (
      <MainShell
        user={user}
        section={section}
        onSection={setSection}
        onLogout={logout}
        onUserUpdate={setUser}
      />
    );
  return null;
}
