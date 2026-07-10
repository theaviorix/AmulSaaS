import React, { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { accounts } from "@/lib/accounts";
import { requestOTP, verifyOTP } from "@/lib/otp";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MailCheck, Loader2 } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";

export default function VerifyEmail() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const accountId = params.get("accountId");
  const roleParam = params.get("role");
  const account = accountId ? accounts.get(accountId) : null;

  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  // Demo-mode only: there's no email server wired up, so the code that
  // would normally be emailed is shown directly here instead.
  const [demoCode, setDemoCode] = useState(params.get("demoCode") || "");
  const [resent, setResent] = useState(false);

  if (!account) {
    return (
      <AuthLayout icon={MailCheck} title="Link expired" subtitle="This verification link is no longer valid.">
        <Link to="/register" className="text-primary font-medium hover:underline text-sm">
          Back to sign up
        </Link>
      </AuthLayout>
    );
  }

  const handleVerify = (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      verifyOTP(`email:${account.email}`, code);
      accounts.markEmailVerified(account.id);
      const roleQuery = roleParam ? `&role=${roleParam}` : "";
      navigate(`/onboarding?accountId=${account.id}${roleQuery}`);
    } catch (err) {
      setError(err.message || "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = () => {
    setError("");
    try {
      const newCode = requestOTP(`email:${account.email}`);
      setDemoCode(newCode);
      setResent(true);
      setTimeout(() => setResent(false), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <AuthLayout
      icon={MailCheck}
      title="Confirm your email"
      subtitle={`Enter the 6-digit code to verify ${account.email}`}
      footer={
        <>
          Wrong email?{" "}
          <Link to="/register" className="text-primary font-medium hover:underline">
            Start over
          </Link>
        </>
      }
    >
      {demoCode && (
        <div className="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
          <strong>Demo mode:</strong> no email server is connected yet, so here's your code: <span className="font-mono font-semibold">{demoCode}</span>
        </div>
      )}
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}
      {resent && (
        <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm">
          A new code was generated.
        </div>
      )}

      <form onSubmit={handleVerify} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="otp">Verification code</Label>
          <Input
            id="otp"
            name="otp"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            maxLength={6}
            placeholder="123456"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            className="h-12 text-center text-lg tracking-[0.3em] font-mono"
            required
          />
        </div>
        <Button type="submit" className="w-full h-12 font-medium" disabled={loading || code.length !== 6}>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Verifying...
            </>
          ) : (
            "Verify email"
          )}
        </Button>
        <button
          type="button"
          onClick={handleResend}
          className="w-full text-center text-sm text-primary hover:underline"
        >
          Resend code
        </button>
      </form>
    </AuthLayout>
  );
}
