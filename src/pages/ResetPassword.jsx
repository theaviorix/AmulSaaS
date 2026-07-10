import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { updatePassword, getErrorMessage, onAuthStateChange } from "@/lib/supabaseAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Loader2, ShieldCheck } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false); // waiting for Supabase to pick up the recovery session from the URL
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    // Supabase-js reads the recovery token out of the URL automatically on
    // load; we just need to wait for the resulting auth state event before
    // trusting that we're in a valid recovery session.
    const unsubscribe = onAuthStateChange(() => setReady(true));
    const timeout = setTimeout(() => setReady(true), 2500); // fallback in case the event already fired before we subscribed
    return () => { unsubscribe(); clearTimeout(timeout); };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      await updatePassword(newPassword);
      setDone(true);
      setTimeout(() => navigate("/login"), 1800);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to reset password. The link may have expired — request a new one."));
    } finally {
      setLoading(false);
    }
  };

  if (!ready) {
    return (
      <AuthLayout icon={Lock} title="Verifying link..." subtitle="One moment">
        <div className="flex justify-center py-4">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </AuthLayout>
    );
  }

  if (done) {
    return (
      <AuthLayout icon={ShieldCheck} title="Password updated" subtitle="Redirecting you to log in...">
        <div className="flex justify-center py-2">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      icon={Lock}
      title="Set a new password"
      subtitle="Choose a new password for your account"
      footer={
        <Link to="/login" className="text-primary font-medium hover:underline">
          Back to log in
        </Link>
      }
    >
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="password">New password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              autoFocus
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
          <Label htmlFor="confirm">Confirm new password</Label>
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
              Updating...
            </>
          ) : (
            "Update password"
          )}
        </Button>
      </form>
    </AuthLayout>
  );
}
