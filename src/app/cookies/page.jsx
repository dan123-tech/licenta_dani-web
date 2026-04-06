import LegalDocPage from "@/components/legal/LegalDocPage";

export const metadata = {
  title: "Cookie preferences | FleetShare",
  description: "How FleetShare uses cookies and local storage.",
};

export default function CookiesPage() {
  return <LegalDocPage prefix="legal.cookies" />;
}
