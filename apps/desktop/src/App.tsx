import { useCallback, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Bell } from "./components/Bell";
import { MainShell } from "./panels/MainShell";
import type { AppSection, BillingStatus, Invoice, UserAccount } from "./types";
import "./App.css";

type Phase = "splash" | "auth" | "paywall" | "app";

function SplashScreen({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2400);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div className="splash">
      <Bell animate className="splash-bell" />
      <h1>Payphone</h1>
      <p>International Tele Communications</p>
    </div>
  );
}

function AuthScreen({ onSuccess }: { onSuccess: (u: UserAccount) => void }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      if (mode === "register") {
        const r = await invoke<{
          username: string;
          stellar_public_key: string;
          circle_wallet_address: string;
          masked_number: string;
          storage_paid: boolean;
        }>("register_account", { username, email, password });
        onSuccess({
          username: r.username,
          email,
          stellar_public_key: r.stellar_public_key,
          circle_wallet_address: r.circle_wallet_address,
          masked_number: r.masked_number,
          storage_paid: r.storage_paid,
        });
      } else {
        onSuccess(await invoke<UserAccount>("login_account", { username, password }));
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
        <Bell className="auth-bell" />
        <h1>{mode === "login" ? "Sign in" : "Create account"}</h1>
        <p className="hint">
          Demo: sign in with any username and password to explore the UI. Masked calls require a
          Stellar username (7–22 chars, must include a number).
        </p>
        <div className="auth-tabs">
          <button type="button" className={mode === "login" ? "active" : ""} onClick={() => setMode("login")}>
            Log in
          </button>
          <button type="button" className={mode === "register" ? "active" : ""} onClick={() => setMode("register")}>
            Register
          </button>
        </div>
        <label>
          Username
          <input value={username} onChange={(e) => setUsername(e.target.value)} required />
        </label>
        {mode === "register" && (
          <label>
            Email
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
        )}
        <label>
          Password
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
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
      if (!b.btcpay_configured) return;
      setInvoice(await invoke<Invoice>("create_storage_invoice"));
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
        <h1>Activate 1 GB storage</h1>
        <p>@{user.username} — contacts &amp; call history</p>
        {billing && <p className="hint">BTCPay: {billing.btcpay_url}</p>}
        {invoice && <p className="invoice-amt">${invoice.amount} {invoice.currency}</p>}
        {error && <p className="error">{error}</p>}
        {invoice && (
          <>
            <button
              type="button"
              className="btn-primary"
              onClick={() => invoice && invoke("open_url", { url: invoice.checkout_link })}
            >
              Pay with Bitcoin
            </button>
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
          </>
        )}
        <button
          type="button"
          className="btn-secondary"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              onActivated(await invoke<UserAccount>("demo_activate_storage"));
            } catch (e) {
              setError(String(e));
            } finally {
              setBusy(false);
            }
          }}
        >
          Continue in demo mode
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const [phase, setPhase] = useState<Phase>("splash");
  const [user, setUser] = useState<UserAccount | null>(null);
  const [section, setSection] = useState<AppSection>("dashboard");

  function afterSplash() {
    invoke<UserAccount | null>("get_session")
      .then((s) => {
        if (!s) {
          setPhase("auth");
          return;
        }
        setUser(s);
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
          setPhase("app");
        }}
      />
    );
  if (phase === "app" && user)
    return <MainShell user={user} section={section} onSection={setSection} onLogout={logout} />;
  return null;
}
