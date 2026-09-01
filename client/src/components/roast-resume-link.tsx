import { useQuery } from "@tanstack/react-query";
import { FileText } from "lucide-react";

export function RoastResumeLink({ email }: { email?: string | null }) {
  const address = (email || "").trim();
  const { data } = useQuery<{ configured: boolean; found: boolean; url: string | null }>({
    queryKey: ["roast-resume", address],
    queryFn: async () => {
      const res = await fetch(`/api/roast-resume?email=${encodeURIComponent(address)}`);
      if (!res.ok) throw new Error("Lookup failed");
      return res.json();
    },
    enabled: !!address,
    staleTime: 5 * 60 * 1000,
  });

  if (!data?.found || !data.url) return null;

  return (
    <a
      href={data.url}
      target="_blank"
      rel="noreferrer"
      className="text-xs text-primary hover:underline inline-flex items-center gap-1"
    >
      <FileText className="h-3 w-3" />
      Open roast resume
    </a>
  );
}
