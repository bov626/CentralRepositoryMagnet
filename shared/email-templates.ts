export const EMAIL_TEMPLATES = {
  "same-day": {
    subject: "Service Agreement",
    body: `{First Name},

After our call, it's clear you're a great fit for this.

I'd be excited to help you land J2.

Here's the service outline in writing:
https://bit.ly/Service-outline

Happy to answer any questions, otherwise let me know how you'd like to move forward.

– W.W.`,
  },
  "day-3": {
    subject: "Following up",
    body: `{Name},

Just wanted to follow-up.

I've got one slot left in the group and I'm mentally holding it open for you.

I know you're mid-interview right now, so if one of those turns into an offer, I'd obviously just refund you. Or we could always look for a third role ;).

Let me know either way.

-W.W.`,
  },
  "day-7": {
    subject: "Closing the loop",
    body: `{First Name},

I'll keep this short.

If now isn't the right time, no stress — I just don't want to leave you hanging.

If you still want in this cohort, reply and I'll hold the slot. Otherwise I'll check back later.

– W.W.`,
  },
  "check-in": {
    subject: "Checking in",
    body: `{First Name},

Been a while since we talked.

Wanted to see where you're at with the second-role plan and whether it's useful to reconnect.

No pressure either way.

– W.W.`,
  },
  "follow-up": {
    subject: "Following up",
    body: `{Name},

Just wanted to follow-up.

I've got one slot left in the group and I'm mentally holding it open for you.

    Let me know either way.

-W.W.`,
  },
  "community-welcome": {
    subject: "You're in",
    body: `{First Name},

Welcome in.

I'll send the onboarding bits in a second — reply if you want a hand getting set up.

– W.W.`,
  },
} as const;

export type TemplateKey = keyof typeof EMAIL_TEMPLATES;

export function fillTemplate(body: string, name: string): string {
  const firstName = name.split(" ")[0] || name;
  return body.replace(/\{First Name\}/g, firstName).replace(/\{Name\}/g, name);
}

export function templateForCadence(cadence: string | null, pipeline?: string | null): TemplateKey {
  if (pipeline === "community") return "community-welcome";
  if (cadence === "same-day") return "same-day";
  if (cadence === "day-3") return "day-3";
  if (cadence === "day-7") return "day-7";
  if (cadence?.startsWith("check-in")) return "check-in";
  return "follow-up";
}
