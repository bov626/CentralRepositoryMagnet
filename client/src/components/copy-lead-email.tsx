import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export async function copyLeadEmail(email: string | null | undefined, name?: string) {
  if (!email) {
    toast({
      title: "No email",
      description: name ? `${name} has no email on the card.` : "This lead has no email.",
      variant: "destructive",
    });
    return;
  }
  try {
    await navigator.clipboard.writeText(email);
    toast({ title: "Copied", description: email });
  } catch {
    toast({ title: "Could not copy", description: email, variant: "destructive" });
  }
}

function stopCard(event: React.SyntheticEvent) {
  event.stopPropagation();
  event.preventDefault();
}

export function CopyLeadName({
  name,
  email,
  className,
}: {
  name: string;
  email?: string | null;
  className?: string;
}) {
  return (
    <button
      type="button"
      title={email ? `Copy ${email}` : "No email to copy"}
      onPointerDown={stopCard}
      onClick={(event) => {
        stopCard(event);
        void copyLeadEmail(email, name);
      }}
      className={cn("font-semibold truncate text-left hover:text-primary", className)}
    >
      {name}
    </button>
  );
}

export function CopyableEmail({
  email,
  name,
  className,
}: {
  email?: string | null;
  name?: string;
  className?: string;
}) {
  if (!email) return null;
  return (
    <button
      type="button"
      title={`Copy ${email}`}
      onPointerDown={stopCard}
      onClick={(event) => {
        stopCard(event);
        void copyLeadEmail(email, name);
      }}
      className={cn("truncate text-left hover:text-primary", className)}
    >
      {email}
    </button>
  );
}
