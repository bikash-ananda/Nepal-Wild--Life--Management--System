import React, { useState } from "react";
import { Link } from "react-router-dom";
import { UserPlus, Mail, Lock, Loader2, CheckCircle2 } from "lucide-react";
import { api } from "@/api/apiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import AuthLayout from "@/components/AuthLayout";

export default function Register() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.auth.register({ full_name: fullName, email, password });
      setSubmitted(true);
    } catch (requestError) {
      setError(requestError.message || "Account request could not be submitted.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      icon={submitted ? CheckCircle2 : UserPlus}
      title={submitted ? "Request submitted" : "Request an account"}
      subtitle={submitted ? "An administrator must approve your account before you can sign in." : "Access is managed by the research team."}
      footer={<><span>Already have an account?</span> <Link to="/login" className="text-primary font-medium hover:underline">Log in</Link></>}
    >
      {submitted ? (
        <p className="text-sm text-center text-muted-foreground">Your request was received. Contact your project administrator if you need access soon.</p>
      ) : (
        <>
          {error && <div role="alert" className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full-name">Full name</Label>
              <Input id="full-name" autoComplete="name" value={fullName} onChange={(event) => setFullName(event.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
                <Input id="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="pl-10 h-12" required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password (at least 12 characters)</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
                <Input id="password" type="password" autoComplete="new-password" minLength={12} value={password} onChange={(event) => setPassword(event.target.value)} className="pl-10 h-12" required />
              </div>
            </div>
            <Button type="submit" className="w-full h-12 font-medium" disabled={loading}>
              {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Submitting request…</> : "Request account"}
            </Button>
          </form>
        </>
      )}
    </AuthLayout>
  );
}
