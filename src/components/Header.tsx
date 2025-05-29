
"use client";

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { MoreVertical, MessageSquareText, ListChecks, Info, AlertTriangle, KeyRound, X, Home as HomeIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, limit, Timestamp, getDocs, where } from 'firebase/firestore';
import { cn } from '@/lib/utils';

const LATEST_MESSAGE_TIMESTAMP_KEY_HEADER = 'headerLatestMessageTimestamp';
const CHAT_ROOM_ID = "room123"; // Must match ChatClient
const CHAT_COLLECTION_NAME = `chat_${CHAT_ROOM_ID}`;

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const [dynamicNewMessageCount, setDynamicNewMessageCount] = useState(0);
  const [lastProcessedTimestampHeader, setLastProcessedTimestampHeader] = useState<number | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const item = localStorage.getItem(LATEST_MESSAGE_TIMESTAMP_KEY_HEADER);
        return item ? parseInt(item, 10) : null;
      } catch (e) {
        console.warn("Failed to read latest message timestamp from localStorage for header", e);
        return null;
      }
    }
    return null;
  });

  // Effect to update dynamicNewMessageCount based on new messages
  useEffect(() => {
    if (!db) {
        setDynamicNewMessageCount(0);
        return;
    }

    // If on chat page, clear badge and update timestamp.
    if (pathname === '/chat') {
      setDynamicNewMessageCount(0);
      const updateTimestampOnChatPage = async () => {
        const latestMessageQuery = query(
          collection(db, CHAT_COLLECTION_NAME),
          orderBy('createdAt', 'desc'),
          limit(1)
        );
        try {
          const snapshot = await getDocs(latestMessageQuery);
          let newTimestampToStore = Date.now();
          if (!snapshot.empty) {
            const latestMessageData = snapshot.docs[0].data();
            if (latestMessageData && latestMessageData.createdAt) {
              const msgTimestamp = (latestMessageData.createdAt as Timestamp).toMillis();
              if (msgTimestamp) newTimestampToStore = msgTimestamp;
            }
          }
          if (typeof window !== 'undefined') {
            localStorage.setItem(LATEST_MESSAGE_TIMESTAMP_KEY_HEADER, newTimestampToStore.toString());
          }
          setLastProcessedTimestampHeader(newTimestampToStore);
        } catch (error) {
          console.error("Error updating header timestamp from chat page context:", error);
          // Fallback to ensure timestamp is set
            const now = Date.now();
            if (typeof window !== 'undefined') {
                localStorage.setItem(LATEST_MESSAGE_TIMESTAMP_KEY_HEADER, now.toString());
            }
            setLastProcessedTimestampHeader(now);
        }
      };
      updateTimestampOnChatPage();
      return; // Don't set up listener if on chat page
    }

    // If no last processed timestamp, don't show badge (count remains 0) until menu is interacted with.
    if (lastProcessedTimestampHeader === null) {
      setDynamicNewMessageCount(0);
      return;
    }

    // Query for messages newer than lastProcessedTimestampHeader
    const q = query(
      collection(db, CHAT_COLLECTION_NAME),
      where('createdAt', '>', Timestamp.fromMillis(lastProcessedTimestampHeader))
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (pathname !== '/chat') { // Ensure we're not on chat page when setting count
        setDynamicNewMessageCount(snapshot.size);
      } else {
        setDynamicNewMessageCount(0); // Safety clear if somehow this runs while on chat page
      }
    }, (error) => {
      console.error("Error listening for new messages for badge count:", error);
      setDynamicNewMessageCount(0);
    });

    return () => unsubscribe();
  }, [pathname, lastProcessedTimestampHeader, db]);


  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === "000") {
      setPasswordError('');
      setIsPasswordDialogOpen(false);
      setPasswordInput('');
      router.push('/chat');
    } else {
      setPasswordError('Incorrect password. Please try again.');
    }
  };

  const openPasswordDialog = () => {
    setPasswordInput('');
    setPasswordError('');
    setIsPasswordDialogOpen(true);
  };

  const showMainTitle = pathname !== '/chat';

  const handleMenuOpenChange = async (open: boolean) => {
    if (open) { // Menu is being opened
      setDynamicNewMessageCount(0); // Clear badge immediately
      
      const latestMessageQuery = query(
        collection(db, CHAT_COLLECTION_NAME),
        orderBy('createdAt', 'desc'),
        limit(1)
      );
      try {
        const snapshot = await getDocs(latestMessageQuery);
        let newTimestampToStore = Date.now(); 
        if (!snapshot.empty) {
          const latestMessageData = snapshot.docs[0].data();
          if (latestMessageData && latestMessageData.createdAt) {
             const msgTimestamp = (latestMessageData.createdAt as Timestamp).toMillis();
             if (msgTimestamp) {
                newTimestampToStore = msgTimestamp;
             }
          }
        }
        if (typeof window !== 'undefined') {
            localStorage.setItem(LATEST_MESSAGE_TIMESTAMP_KEY_HEADER, newTimestampToStore.toString());
        }
        setLastProcessedTimestampHeader(newTimestampToStore);
      } catch (error) {
        console.error("Error fetching latest message for timestamp update on menu open:", error);
        // Fallback: update timestamp to now to prevent re-badging old messages if query fails
        const now = Date.now();
        if (typeof window !== 'undefined') {
            localStorage.setItem(LATEST_MESSAGE_TIMESTAMP_KEY_HEADER, now.toString());
        }
        setLastProcessedTimestampHeader(now);
      }
    }
  };

  return (
    <>
      <header className="py-4 px-6 border-b border-border sticky top-0 bg-background/95 backdrop-blur z-50">
        <div className="container mx-auto flex justify-between items-center">
          {showMainTitle ? (
            <Link href="/" className="text-xl font-semibold hover:text-primary transition-colors">
              All Games
            </Link>
          ) : (
            <div className="text-xl font-semibold">&nbsp;</div> 
          )}
          <DropdownMenu onOpenChange={handleMenuOpenChange}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <MoreVertical className="h-5 w-5" />
                {dynamicNewMessageCount > 0 && (
                  <span
                    className={cn(
                      "absolute top-0.5 right-0.5 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-semibold leading-none h-4",
                      dynamicNewMessageCount > 9 ? "px-1.5" : "w-4" // Wider for '9+'
                    )}
                  >
                    {dynamicNewMessageCount > 9 ? '9+' : dynamicNewMessageCount}
                  </span>
                )}
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href="/" className="flex items-center gap-2 cursor-pointer">
                  <HomeIcon className="h-4 w-4" />
                  Home
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/about" className="flex items-center gap-2 cursor-pointer">
                  <Info className="h-4 w-4" />
                  About
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/features" className="flex items-center gap-2 cursor-pointer">
                  <ListChecks className="h-4 w-4" />
                  Features
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/feedback" className="flex items-center gap-2 cursor-pointer">
                  <MessageSquareText className="h-4 w-4" />
                  Feedback
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={openPasswordDialog}
                className="flex items-center gap-2 cursor-pointer"
              >
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <span className="sr-only">Secret Chat</span> 
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Admin Access Required</DialogTitle>
            <DialogDescription>
              This chat room is for authorized personnel only. Please enter the password to continue.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handlePasswordSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="password-header" className="text-right col-span-1"> {/* Changed id for label */}
                  <KeyRound className="inline-block h-5 w-5 mr-1" />
                  Password
                </Label>
                <Input
                  id="password-header" 
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className="col-span-3"
                  required
                />
              </div>
              {passwordError && (
                <p className="text-sm text-destructive col-span-4 text-center">{passwordError}</p>
              )}
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit">Unlock Chat</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
