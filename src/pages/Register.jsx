import React from "react";
import { Link } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";

export default function Register() {
  return (
    <AuthLayout
      icon={ShieldCheck}
      title="Accounts are administrator-managed"
      subtitle="Self-service registration is disabled for this research system."
      footer={<><span>Already have an account?</span> <Link to="/login" className="text-primary font-medium hover:underline">Log in</Link></>}
    >
      <div className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm leading-6 text-sky-950">
        Ask your project administrator to create an account with your work email address and assign your research site access.
      </div>
    </AuthLayout>
  );
}
