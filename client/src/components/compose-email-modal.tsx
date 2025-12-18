import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useStore } from "@/lib/data";
import { useState, useEffect } from "react";
import { Send, Sparkles } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export function ComposeEmailModal() {
  const { emailingLead, setEmailingLead } = useStore();
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  // Reset fields when a new lead is selected
  useEffect(() => {
    if (emailingLead) {
      setSubject(`Following up on our conversation`);
      setBody(`Hi ${emailingLead.name.split(' ')[0]},\n\nGreat chatting with you earlier. Just wanted to follow up on...`);
    }
  }, [emailingLead]);

  if (!emailingLead) return null;

  const handleSend = () => {
    // Simulate sending email
    toast({
        title: "Email Sent",
        description: `Sent to ${emailingLead.email || emailingLead.name}`,
    });
    setEmailingLead(null);
  };

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
                value="Wyedoyoudothis@gmail.com" 
                disabled 
                className="col-span-3 bg-muted/50 border-transparent text-muted-foreground" 
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right text-muted-foreground text-xs uppercase tracking-wider">To</Label>
            <div className="col-span-3 flex items-center gap-2">
                <Input 
                    value={emailingLead.email || ""} 
                    placeholder="recipient@example.com"
                    className="bg-transparent"
                />
            </div>
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
            <Button variant="outline" onClick={() => setEmailingLead(null)}>Cancel</Button>
            <Button onClick={handleSend} className="gap-2">
                <Send className="h-4 w-4" /> Send Email
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
