
"use client";

import { useState } from 'react';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Send } from 'lucide-react';

export default function FeedbackPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, you'd send this data to a backend or email service.
    console.log({ name, email, message });
    toast({
      title: "Feedback Sent!",
      description: "Thank you for your feedback. We'll review it shortly.",
      variant: "default",
    });
    // Reset form
    setName('');
    setEmail('');
    setMessage('');
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8 flex justify-center">
        <div className="bg-card p-8 rounded-lg shadow-md w-full max-w-2xl">
          <h1 className="text-3xl font-bold mb-6 text-center">Submit Feedback</h1>
          <p className="text-muted-foreground mb-8 text-center">
            We'd love to hear your thoughts or suggestions!
          </p>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="name">Name (Optional)</Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your Name"
              />
            </div>
            <div>
              <Label htmlFor="email">Email (Optional)</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your.email@example.com"
              />
            </div>
            <div>
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Tell us what you think..."
                rows={5}
                required
              />
            </div>
            <Button type="submit" className="w-full">
              <Send className="mr-2 h-4 w-4" /> Send Feedback
            </Button>
          </form>
        </div>
      </main>
      <footer className="py-4 text-center text-sm text-muted-foreground border-t">
        Naughts & Crosses Communicator &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}
