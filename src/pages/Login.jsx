import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { accounts } from "@/lib/accounts";
import { store } from "@/lib/store";
import { requestOTP } from "@/lib/otp";
import { useSession } from "@/lib/AppSession";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogIn, Mail, Lock, Loader2 } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";

export default function Login() {
  const navigate = useNavigate();
  const { setSession } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    // Read straight from the form as a fallback: some mobile browsers /
    // password managers autofill inputs at the DOM level without firing
    // React's onChange, which previously left the email/password state
    // empty (and login failing with "Invalid email or password") even
    // though the fields looked filled in on screen.
    const data = new FormData(e.target);
    const finalEmail = (data.get("email") || email || "").toString();
    const finalPassword = (data.get("password") || password || "").toString();
    try {
      const account = accounts.login(finalEmail, finalPassword);

      if (!account.role || !account.profileId) {
        // Registered but never finished setting up their business/shop profile.
        navigate(`/onboarding?accountId=${account.id}`);
        return;
      }

      if (account.role === "supplier") {
        setSession({
          accountId: account.id,
          email: account.email,
          role: "supplier",
          userId: account.userId,
          profileId: account.profileId,
          remember,
        });
        navigate("/supplier");
        return;
      }

      // customer: also restore the supplier link info the dashboard needs
      const link = store.find(
        "supplier_links",
        (l) => l.customer_profile_id === account.profileId
      );
      setSession({
        accountId: account.id,
        email: account.email,
        role: "customer",
        userId: account.userId,
        profileId: account.profileId,
        linkId: link?.id,
        supplierUserId: link?.supplier_user_id,
        supplierProfileId: link?.supplier_profile_id,
        remember,
      });
      navigate("/customer/new-order");
    } catch (err) {
      if (err.code === "EMAIL_NOT_VERIFIED") {
        const code = requestOTP(`email:${finalEmail.trim().toLowerCase()}`);
        navigate(`/verify-email?accountId=${err.accountId}&demoCode=${code}`);
        return;
      }
      setError(err.message || "Invalid email or password");
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      icon={LogIn}
      title="Welcome back"
      subtitle="Log in to your account"
      footer={
        <>
          Don't have an account?{" "}
          <Link to="/register" className="text-primary font-medium hover:underline">
            Create one
          </Link>
        </>
      }
    >
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="email"
              name="email"
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
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link to="/forgot-password" className="text-xs text-primary hover:underline">
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10 h-12"
              required
            />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-muted-foreground select-none cursor-pointer">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="w-4 h-4 rounded border-mist accent-primary"
          />
          Remember me
        </label>
        <Button type="submit" className="w-full h-12 font-medium" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Logging in...
            </>
          ) : (
            "Log in"
          )}
        </Button>
      </form>
    </AuthLayout>
  );
}
