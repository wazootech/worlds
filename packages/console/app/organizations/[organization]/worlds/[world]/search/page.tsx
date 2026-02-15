import { WorldSearchContent } from "@/components/world-search-content";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Search",
};

export default function WorldSearchPage() {
  return <WorldSearchContent />;
}
