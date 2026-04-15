import PaymentPageClient from "./PaymentPageClient";
import { Suspense } from "react";

export const metadata = {
  title: "Payment | FleetShare",
};

export default function PaymentPage() {
  return (
    <Suspense fallback={null}>
      <PaymentPageClient />
    </Suspense>
  );
}

