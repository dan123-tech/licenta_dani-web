import Link from "next/link";

export const metadata = {
  title: "Payment successful | FleetShare",
};

export default function BillingSuccessPage() {
  return (
    <main className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="max-w-lg w-full rounded-2xl border p-6 text-center" style={{ borderColor: "rgba(255,255,255,0.12)" }}>
        <h1 className="text-2xl font-bold text-white mb-2">Payment successful</h1>
        <p className="text-sm mb-6" style={{ color: "rgba(255,255,255,0.7)" }}>
          Thanks! Your checkout completed successfully.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="h-11 px-6 rounded-xl flex items-center justify-center font-semibold text-sm bg-[#185fa5] text-white hover:bg-[#1d4ed8] transition-all"
          >
            Go to Home
          </Link>
          <Link
            href="/dashboard"
            className="h-11 px-6 rounded-xl flex items-center justify-center font-semibold text-sm border border-white/15 text-white/85 hover:bg-white/5 transition-all"
          >
            Open Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}

