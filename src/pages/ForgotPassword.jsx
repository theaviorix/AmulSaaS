import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { accounts } from "@/lib/accounts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Lock, ArrowLeft, Loader2 } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";

// Since this app currently has no email server (local storage only),
// the "reset code" is generated locally and shown directly on screen
// instead of being emailed. Swap for a real emailed link/token once
// this moves to a backend.
export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [displayedCode, setDisplayedCode] = useState("");

  const handleRequest = (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const result = accounts.requestPasswordReset(email);
    setLoading(false);
    // Always proceed to step 2 regardless of whether the account exists,
    // so we don't reveal which emails are registered.
    if (result) setDisplayedCode(result.resetCode);
    setStep(2);
  };

  const handleReset = (e) => {
    e.preventDefault();
    setError("");
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      accounts.resetPassword(email, code, newPassword);
      navigate("/login");
    } catch (err) {
      setError(err.message || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  if (step === 1) {
    return (
      <AuthLayout
        icon={Mail}
        title="Reset password"
        subtitle="Enter your account email to get a reset code"
        footer={
          <Link to="/login" className="text-primary font-medium hover:underline">
            <ArrowLeft className="w-3 h-3 inline mr-1" />Back to log in
          </Link>
        }
      >
        <form onSubmit={handleRequest} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email address</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
              <Input
                id="email"
                type="email"
                autoComplete="email"
                autoFocus
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 h-12"
                required
              />
            </div>
          </div>
          <Button type="submit" className="w-full h-12 font-medium" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Checking...
              </>
            ) : (
              "Get reset code"
            )}
          </Button>
        </form>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      icon={Lock}
      title="Enter new password"
      subtitle={`Reset code for ${email}`}
      footer={
        <Link to="/login" className="text-primary font-medium hover:underline">
          <ArrowLeft className="w-3 h-3 inline mr-1" />Back to log in
        </Link>
      }
    >
      {displayedCode && (
        <div className="mb-4 p-3 rounded-lg bg-primary/10 text-sm text-foreground">
          No email server is set up yet, so here's your reset code directly:{" "}
          <span className="font-mono font-semibold">{displayedCode}</span>
          <p className="mt-1 text-xs text-muted-foreground">This code expires in 15 minutes.</p>
        </div>
      )}
      {!displayedCode && (
        <p className="mb-4 text-sm text-muted-foreground">
          If an account exists with that email, use the code you were given to continue.
        </p>
      )}
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}
      <form onSubmit={handleReset} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="code">Reset code</Label>
          <Input
            id="code"
            autoFocus
            placeholder="ABC123"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="h-12 uppercase"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">New Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              placeholder="At least 6 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="pl-10 h-12"
              required
              minLength={6}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm">Confirm Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="confirm"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="pl-10 h-12"
              required
              minLength={6}
            />
          </div>
        </div>
        <Button type="submit" className="w-full h-12 font-medium" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Resetting...
            </>
          ) : (
            "Reset password"
          )}
        </Button>
      </form>
    </AuthLayout>
  );
}
