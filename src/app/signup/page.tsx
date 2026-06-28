"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const router = useRouter();
  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSignup(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          // Passed to the database, which auto-creates the business account.
          data: { business_name: businessName },
        },
      });
      if (error) {
        setError(error.message);
        return;
      }
      // If email confirmation is OFF, the user is logged in immediately.
      if (data.session) {
        router.push("/");
        router.refresh();
      } else {
        setNotice(
          "Account created! Please check your email to confirm, then log in.",
        );
      }
    } catch {
      setError(
        "Could not connect. Make sure your Supabase keys are set in .env.local.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-brand px-5 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-wide text-white">ATS</h1>
          <p className="mt-1 text-sm text-white/70">Arvin Tech Solution</p>
        </div>

        <form
          onSubmit={handleSignup}
          className="rounded-2xl bg-white p-6 shadow-xl"
        >
          <h2 className="mb-6 text-xl font-semibold text-brand">
            Create your account
          </h2>

          <label className="mb-1 block text-sm font-medium text-brand">
            Business name
          </label>
          <input
            type="text"
            required
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            className="mb-4 w-full rounded-xl border border-gray-300 px-4 py-3 text-base text-gray-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
            placeholder="e.g. Kabul Trading Co."
          />

          <label className="mb-1 block text-sm font-medium text-brand">
            Email
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            className="mb-4 w-full rounded-xl border border-gray-300 px-4 py-3 text-base text-gray-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
            placeholder="you@example.com"
          />

          <label className="mb-1 block text-sm font-medium text-brand">
            Password
          </label>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            className="mb-5 w-full rounded-xl border border-gray-300 px-4 py-3 text-base text-gray-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
            placeholder="At least 6 characters"
          />

          {error && (
            <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}
          {notice && (
            <p className="mb-4 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
              {notice}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-brand py-3.5 text-base font-semibold text-white transition-colors hover:bg-brand-dark disabled:opacity-60"
          >
            {loading ? "Creating…" : "Create account"}
          </button>

          <p className="mt-5 text-center text-sm text-gray-600">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-brand underline">
              Log in
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}
