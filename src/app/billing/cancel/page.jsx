import Link from "next/link";

export const metadata = {
  title: "Payment cancelled | FleetShare",
};

export default function BillingCancelPage() {
  return (
    <main className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="max-w-lg w-full rounded-2xl border p-6 text-center" style={{ borderColor: "rgba(255,255,255,0.12)" }}>
        <h1 className="text-2xl font-bold text-white mb-2">Checkout cancelled</h1>
        <p className="text-sm mb-6" style={{ color: "rgba(255,255,255,0.7)" }}>
          No charges were made. You can try again whenever you’re ready.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/prices"
            className="h-11 px-6 rounded-xl flex items-center justify-center font-semibold text-sm bg-[#185fa5] text-white hover:bg-[#1d4ed8] transition-all"
          >
            Back to Pricing
          </Link>
          <Link
            href="/contact"
            className="h-11 px-6 rounded-xl flex items-center justify-center font-semibold text-sm border border-white/15 text-white/85 hover:bg-white/5 transition-all"
          >
            Contact Sales
          </Link>
        </div>
      </div>
    </main>
  );
}

