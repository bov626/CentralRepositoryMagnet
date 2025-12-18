import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useStore } from "@/lib/data";
import { useState, useEffect } from "react";
import { Send, Sparkles, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export function ComposeEmailModal() {
  const { emailingLead, setEmailingLead } = useStore();
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

  const handleSend = async () => {
    if (!recipientEmail) {
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
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send email');
      }

      toast({
        title: "Email Sent",
        description: `Sent to ${recipientEmail}`,
      });
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
                    <Button variant="ghost" size="sm" className="text-xs text-muted-foreground gap-1 h-6">
                        <Sparkles className="h-3 w-3" /> AI Improve
                    </Button>
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
