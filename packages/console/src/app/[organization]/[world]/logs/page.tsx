import { NuqsAdapter } from "nuqs/adapters/next/app";
import { WorldLogsContent } from "@/components/world-logs-content";

export const metadata = {
  title: "Logs",
};

export default function WorldLogsPage() {
  return (
    <NuqsAdapter>
      <WorldLogsContent />
    </NuqsAdapter>
  );
}
