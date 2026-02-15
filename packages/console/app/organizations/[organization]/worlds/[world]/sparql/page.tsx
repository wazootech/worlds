import { WorldSparqlContent } from "@/components/world-sparql-content";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "SPARQL",
};

export default function WorldSparqlPage() {
  return <WorldSparqlContent />;
}
