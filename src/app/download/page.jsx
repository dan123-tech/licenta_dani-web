import DownloadPageClient from "./DownloadPageClient";

export const metadata = {
  title: "Download | FleetShare",
  description:
    "FleetShare: use the web app, download source to self-host for your company, or install the Android APK.",
};

export default function DownloadPage() {
  return <DownloadPageClient />;
}
