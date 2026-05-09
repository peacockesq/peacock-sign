import { useEffect, useState } from "react";
import axios from "axios";

function billingBaseUrl() {
  const base = localStorage.getItem("baseUrl") || "/api/app/";
  return base.replace(/\/app\/?$/, "").replace(/\/$/, "") + "/billing";
}

function authHeaders() {
  return {
    "X-Parse-Session-Token": localStorage.getItem("accesstoken") || "",
  };
}

export default function Billing() {
  const [status, setStatus] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  async function loadStatus() {
    setError("");
    setLoading(true);
    try {
      const res = await axios.get(`${billingBaseUrl()}/status`, { headers: authHeaders() });
      setStatus(res.data);
    } catch (err) {
      setError(err?.response?.data?.message || err.message || "Could not load billing status.");
    } finally {
      setLoading(false);
    }
  }

  async function redirectFromEndpoint(path) {
    setBusy(true);
    setError("");
    try {
      const res = await axios.post(`${billingBaseUrl()}${path}`, {}, { headers: authHeaders() });
      if (res.data?.url) {
        window.location.href = res.data.url;
      } else {
        setError("Billing redirect URL was not returned.");
      }
    } catch (err) {
      setError(err?.response?.data?.message || err.message || "Billing action failed.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    loadStatus();
  }, []);

  return (
    <div className="op-card bg-base-100 text-base-content shadow-xl max-w-3xl mx-auto my-8">
      <div className="op-card-body">
        <h1 className="op-card-title text-2xl">LexySign Billing</h1>
        <div className="rounded-xl border border-amber-500/40 bg-amber-50 px-4 py-3 text-amber-950 shadow-sm">
          <p className="font-semibold">90 days free with code <span className="font-mono">LEXY90</span></p>
          <p className="text-sm">
            Enter the promo code at checkout. A credit card is required, then billing starts at $5/month after the promotional period.
          </p>
        </div>
        <p className="text-sm opacity-80">
          $5/month includes up to 1,000 e-sign units per billing month via API or UI.
        </p>

        {loading ? (
          <p>Loading billing status…</p>
        ) : status ? (
          <div className="space-y-2 my-4">
            <p>
              <strong>Status:</strong> {status.subscriptionStatus}
            </p>
            <p>
              <strong>Usage:</strong> {status.used} / {status.monthlyESignLimit} this period
            </p>
            <p>
              <strong>Remaining:</strong> {status.remaining}
            </p>
          </div>
        ) : null}

        {error && <div className="op-alert op-alert-error my-4">{error}</div>}

        <div className="op-card-actions justify-start">
          <button
            className="op-btn op-btn-primary"
            disabled={busy}
            onClick={() => redirectFromEndpoint("/create-checkout-session")}
          >
            Subscribe for $5/month
          </button>
          <button
            className="op-btn op-btn-outline"
            disabled={busy}
            onClick={() => redirectFromEndpoint("/create-portal-session")}
          >
            Manage subscription
          </button>
          <button className="op-btn op-btn-ghost" disabled={busy} onClick={loadStatus}>
            Refresh
          </button>
        </div>
      </div>
    </div>
  );
}
