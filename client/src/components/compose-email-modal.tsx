import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useStore } from "@/lib/data";
import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Send, Loader2, FileText } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const EMAIL_TEMPLATES = {
  "follow-up": {
    subject: "Following up",
    body: `{Name},

Just wanted to follow-up.

I've got one slot left in the group and I'm mentally holding it open for you.

I know you're mid-interview right now, so if one of those turns into an offer, I'd obviously just refund you. Or we could always look for a third role ;).

Let me know either way.

-W.W.`
  },
  "initial-service": {
    subject: "Service Agreement",
    body: `{First Name},

After our call yesterday, it's clear you're a great fit for this.

I'd be excited to help you land J2.

Here's the service outline in writing:
https://bit.ly/Service-outline

Happy to answer any questions, otherwise let me know how you'd like to move forward.

– W.W.`
  },
  "onboarding-1": {
    subject: "Onboarding Details",
    body: `{Name},

Perfect. Here's how we'll get you onboarded:

1. Review the Service Outline
https://bit.ly/Service-Outline

2. Complete Payment
https://buy.stripe.com/dRm8wP9Wo24acLEfu8gbm02 

3. Onboarding Session #1
This first session is about understanding you (motivations, goals, how you think).
The answers directly inform how we dial in your resume, cover letter, and LinkedIn.

Session #2 will lock in the exact roles we're targeting and review the finalized application assets.

For now, please complete this onboarding questionnaire (≈30 minutes): https://jumpseatboarding.com/questions1

Let me know if you have any questions.

– W.W.`
  }
};

export function ComposeEmailModal() {
  const { emailingLead, setEmailingLead } = useStore();
  const queryClient = useQueryClient();
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState("");

  useEffect(() => {
    if (emailingLead) {
      setSubject(`Following up on our conversation`);
      setBody(`Hi ${emailingLead.name.split(' ')[0]},\n\nGreat chatting with you earlier. Just wanted to follow up on...`);
      setRecipientEmail(emailingLead.email || "");
    }
  }, [emailingLead]);

  const applyTemplate = (templateKey: string) => {
    if (!emailingLead) return;
    const template = EMAIL_TEMPLATES[templateKey as keyof typeof EMAIL_TEMPLATES];
    if (!template) return;

    const firstName = emailingLead.name.split(' ')[0];
    const fullName = emailingLead.name;

    const processedBody = template.body
      .replace(/\{First Name\}/g, firstName)
      .replace(/\{Name\}/g, fullName);

    setSubject(template.subject);
    setBody(processedBody);
  };

  const handleSend = async () => {
    if (!recipientEmail || !emailingLead) {
      toast({
        title: "Missing Email",
        description: "Please enter a recipient email address",
        variant: "destructive",
      });
      return;
    }

    setSending(true);
    try {
      const response = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: recipientEmail,
          subject,
          body,
          leadId: emailingLead.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send email');
      }

      toast({
        title: data.mocked ? "Logged (not sent)" : "Email Sent",
        description: data.mocked
          ? `Saved to the timeline. Real send happens on Replit.`
          : `Sent to ${recipientEmail}`,
      });
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["today-focus"] });
      setEmailingLead(null);
    } catch (error: any) {
      toast({
        title: "Failed to Send",
        description: error.message || "Could not send email",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  if (!emailingLead) return null;

  return (
    <Dialog open={!!emailingLead} onOpenChange={(open) => !open && setEmailingLead(null)}>
      <DialogContent className="sm:max-w-[600px] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Compose Email
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right text-muted-foreground text-xs uppercase tracking-wider">From</Label>
            <Input 
                value="wyedoyoudothis@gmail.com" 
                disabled 
                className="col-span-3 bg-muted/50 border-transparent text-muted-foreground" 
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right text-muted-foreground text-xs uppercase tracking-wider">To</Label>
            <Input 
                value={recipientEmail} 
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="recipient@example.com"
                className="col-span-3 bg-transparent"
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right text-muted-foreground text-xs uppercase tracking-wider">Subject</Label>
            <Input 
                value={subject} 
                onChange={(e) => setSubject(e.target.value)}
                className="col-span-3"
            />
          </div>
          
          <div className="grid grid-cols-4 gap-4">
             <Label className="text-right text-muted-foreground text-xs uppercase tracking-wider mt-3">Message</Label>
             <div className="col-span-3">
                 <Textarea 
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    className="min-h-[200px] resize-none"
                 />
                 <div className="flex gap-2 mt-2">
                    <Select onValueChange={applyTemplate}>
                      <SelectTrigger className="w-[180px] h-8 text-xs">
                        <FileText className="h-3 w-3 mr-1" />
                        <SelectValue placeholder="Template" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="follow-up">Follow-up</SelectItem>
                        <SelectItem value="initial-service">Initial Service</SelectItem>
                        <SelectItem value="onboarding-1">Onboarding #1</SelectItem>
                      </SelectContent>
                    </Select>
                 </div>
             </div>
          </div>
        </div>

        <DialogFooter>
            <Button variant="outline" onClick={() => setEmailingLead(null)} disabled={sending}>
              Cancel
            </Button>
            <Button onClick={handleSend} disabled={sending} className="gap-2">
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {sending ? "Sending..." : "Send Email"}
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
