import { WorldSettingsContent } from "@/components/world-settings-content";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Settings",
};

export default function WorldSettingsPage() {
  return <WorldSettingsContent />;
}
