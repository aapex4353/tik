
"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import {
  collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, Timestamp,
  getDocs, writeBatch, doc, deleteDoc, setDoc, where
} from 'firebase/firestore';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Send, Gamepad2, Trash2, MoreVertical, Copy, MessageSquareX, Reply, X, Users, Check, CheckCheck } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Message {
  id: string;
  text: string;
  sender: string;
  createdAt: Timestamp | null;
  roomId: string;
  replyTo?: {
    messageId: string;
    messageText: string;
    senderName: string;
  };
  readBy?: { [key: string]: Timestamp };
}

const CHAT_ROOM_ID = "room123";
const CHAT_COLLECTION_NAME = `chat_${CHAT_ROOM_ID}`;
const ROOM_ACTIVITY_COLLECTION = "room_activity";
const PARTICIPANTS_SUBCOLLECTION = "participants";
const ACTIVE_THRESHOLD_MINUTES = 2;
const PRESENCE_UPDATE_INTERVAL_MS = 60 * 1000;
const TYPING_TIMEOUT_MS = 3000; // Stop showing typing after 3s of inactivity
const STALE_TYPING_THRESHOLD_S = 10; // Consider typing status stale after 10s

export default function ChatClient() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [userName, setUserName] = useState('');
  const [isNameSet, setIsNameSet] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const [isClearChatDialogOpen, setIsClearChatDialogOpen] = useState(false);
  const [isDeleteMessageDialogOpen, setIsDeleteMessageDialogOpen] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState<Message | null>(null);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  
  const [activeUserCount, setActiveUserCount] = useState<number | null>(null);
  const [typingUsersDisplay, setTypingUsersDisplay] = useState<string>('');
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const intersectionObserverRef = useRef<IntersectionObserver | null>(null);
  const observedMessagesRef = useRef(new Set());

  useEffect(() => {
    const storedName = localStorage.getItem('chatUserName');
    if (storedName) {
      setUserName(storedName);
      setIsNameSet(true);
    }
  }, []);

  const updateUserTypingStatus = useCallback(async (isTyping: boolean) => {
    if (!isNameSet || !userName) return;
    const userPresenceRef = doc(db, ROOM_ACTIVITY_COLLECTION, CHAT_ROOM_ID, PARTICIPANTS_SUBCOLLECTION, userName);
    try {
      await setDoc(userPresenceRef, { 
        isTyping, 
        typingTimestamp: isTyping ? serverTimestamp() : null 
      }, { merge: true });
    } catch (error) {
      console.error("Error updating typing status:", error);
    }
  }, [isNameSet, userName]);

  const handleNewMessageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    if (!isNameSet || !userName) return;

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    updateUserTypingStatus(true);
    typingTimeoutRef.current = setTimeout(() => {
      updateUserTypingStatus(false);
    }, TYPING_TIMEOUT_MS);
  };
  
  useEffect(() => {
    if (!isNameSet) return;

    const q = query(collection(db, CHAT_COLLECTION_NAME), orderBy('createdAt', 'asc'));
    const unsubscribeMessages = onSnapshot(q, (querySnapshot) => {
      const msgs: Message[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        // Basic validation for createdAt
        if (data.createdAt && typeof data.createdAt.toDate === 'function') {
          msgs.push({ id: doc.id, ...data } as Message);
        } else {
          // Log or handle messages with invalid createdAt
          console.warn("Message with invalid or missing createdAt field:", doc.id, data);
          // Optionally, push with a null or client-generated timestamp, or filter out
           msgs.push({ id: doc.id, ...data, createdAt: null } as Message);
        }
      });
      setMessages(msgs);
    }, (error) => {
      console.error("Error with message listener: ", error);
      toast({
        title: "Chat Error",
        description: `Could not retrieve messages: ${error.message}. Check console.`,
        variant: "destructive",
      });
    });
    return () => unsubscribeMessages();
  }, [isNameSet, toast]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const markMessageAsRead = useCallback(async (messageId: string) => {
    if (!userName || !messageId) return;
    try {
      const messageRef = doc(db, CHAT_COLLECTION_NAME, messageId);
      await setDoc(messageRef, {
        readBy: {
          [userName]: serverTimestamp()
        }
      }, { merge: true });
    } catch (error) {
      console.error("Error marking message as read:", error);
    }
  }, [userName]);

  useEffect(() => {
    if (!isNameSet || !userName) return;
  
    const setupObserver = () => {
      intersectionObserverRef.current = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const messageId = entry.target.id.replace('message-', '');
            const message = messages.find(msg => msg.id === messageId);
            if (message && message.sender !== userName && (!message.readBy || !message.readBy[userName])) {
              if (!observedMessagesRef.current.has(messageId)) {
                 markMessageAsRead(messageId);
                 observedMessagesRef.current.add(messageId); 
              }
            }
          }
        });
      }, { threshold: 0.8 }); 
  
      messages.forEach(msg => {
        const element = document.getElementById(`message-${msg.id}`);
        if (element && !observedMessagesRef.current.has(msg.id)) {
            if (msg.sender !== userName && (!msg.readBy || !msg.readBy[userName])) {
                 intersectionObserverRef.current?.observe(element);
            }
        }
      });
    };
  
    const cleanupObserver = () => {
      if (intersectionObserverRef.current) {
        intersectionObserverRef.current.disconnect();
        observedMessagesRef.current.clear(); 
      }
    };
    
    cleanupObserver(); 
    setupObserver(); 
  
    return () => cleanupObserver();
  }, [messages, userName, isNameSet, markMessageAsRead]);


  useEffect(() => {
    if (!isNameSet || !userName) return () => {};

    const presenceRef = doc(db, ROOM_ACTIVITY_COLLECTION, CHAT_ROOM_ID, PARTICIPANTS_SUBCOLLECTION, userName);
    const updatePresence = async () => {
      try {
        await setDoc(presenceRef, { name: userName, lastSeen: serverTimestamp() }, { merge: true });
      } catch (error) {
        console.error("Error updating presence:", error);
      }
    };
    updatePresence(); 
    const intervalId = setInterval(updatePresence, PRESENCE_UPDATE_INTERVAL_MS);

    const participantsCollectionRef = collection(db, ROOM_ACTIVITY_COLLECTION, CHAT_ROOM_ID, PARTICIPANTS_SUBCOLLECTION);
    const unsubscribeParticipants = onSnapshot(participantsCollectionRef, (snapshot) => {
      const now = Timestamp.now();
      const activeThreshold = new Timestamp(now.seconds - ACTIVE_THRESHOLD_MINUTES * 60, now.nanoseconds);
      const typingThreshold = new Timestamp(now.seconds - STALE_TYPING_THRESHOLD_S, now.nanoseconds);
      
      let currentActiveCount = 0;
      const currentTypingUsers: string[] = [];

      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        if (data.name) { 
            if (data.lastSeen && data.lastSeen instanceof Timestamp && data.lastSeen.toMillis() > activeThreshold.toMillis()) {
            currentActiveCount++;
            }
            if (data.name !== userName && data.isTyping && data.typingTimestamp && data.typingTimestamp instanceof Timestamp && data.typingTimestamp.toMillis() > typingThreshold.toMillis()) {
            currentTypingUsers.push(data.name);
            }
        }
      });
      setActiveUserCount(currentActiveCount);

      if (currentTypingUsers.length === 0) {
        setTypingUsersDisplay('');
      } else if (currentTypingUsers.length === 1) {
        setTypingUsersDisplay(`${currentTypingUsers[0]} is typing...`);
      } else if (currentTypingUsers.length === 2) {
        setTypingUsersDisplay(`${currentTypingUsers[0]} and ${currentTypingUsers[1]} are typing...`);
      } else {
        setTypingUsersDisplay('Several people are typing...');
      }

    }, (error) => {
      console.error("Error listening to participants:", error);
      toast({
        title: "Presence/Typing Error",
        description: "Could not update active users or typing status.",
        variant: "destructive",
      });
      setActiveUserCount(null);
      setTypingUsersDisplay('');
    });

    return () => {
      clearInterval(intervalId);
      unsubscribeParticipants();
      if (userName) updateUserTypingStatus(false); 
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [isNameSet, userName, toast, updateUserTypingStatus]);


  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (userName.trim()) {
      localStorage.setItem('chatUserName', userName.trim());
      setIsNameSet(true);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() === '' || !isNameSet) return;

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    updateUserTypingStatus(false);

    const messageData: Omit<Message, 'id' | 'createdAt' | 'readBy'> & { createdAt: any } = {
      text: newMessage.trim(),
      sender: userName,
      roomId: CHAT_ROOM_ID,
      createdAt: serverTimestamp(),
    };

    if (replyingTo) {
      messageData.replyTo = {
        messageId: replyingTo.id,
        messageText: replyingTo.text,
        senderName: replyingTo.sender,
      };
    }

    try {
      await addDoc(collection(db, CHAT_COLLECTION_NAME), messageData);
      setNewMessage('');
      setReplyingTo(null); 
    } catch (error) {
      console.error("Error sending message: ", error);
      toast({
        title: "Error Sending Message",
        description: (error instanceof Error ? error.message : "Unknown error: Ensure Firestore is set up and rules allow writes."),
        variant: "destructive",
      });
    }
  };

  const handleClearChat = async () => {
    try {
      const chatCollectionRef = collection(db, CHAT_COLLECTION_NAME);
      const querySnapshot = await getDocs(chatCollectionRef);
      if (querySnapshot.empty) {
        toast({ title: "Chat is already empty." });
        setIsClearChatDialogOpen(false); return;
      }
      const batchOp = writeBatch(db);
      querySnapshot.forEach((docSnapshot) => batchOp.delete(doc(db, CHAT_COLLECTION_NAME, docSnapshot.id)));
      await batchOp.commit();
      toast({ title: "Chat Cleared", description: "All messages have been deleted." });
    } catch (error) {
      console.error("Error clearing chat: ", error);
      toast({ title: "Error Clearing Chat", description: (error instanceof Error ? error.message : "Unknown error"), variant: "destructive" });
    }
    setIsClearChatDialogOpen(false);
  };

  const handleCopyMessage = (text: string) => {
    navigator.clipboard.writeText(text)
      .then(() => toast({ title: "Message Copied!" }))
      .catch(err => {
        console.error("Failed to copy message: ", err);
        toast({ title: "Copy Failed", variant: "destructive" });
      });
  };

  const openDeleteMessageDialog = (msg: Message) => {
    setMessageToDelete(msg);
    setIsDeleteMessageDialogOpen(true);
  };

  const handleDeleteMessage = async () => {
    if (!messageToDelete) return;
    try {
      await deleteDoc(doc(db, CHAT_COLLECTION_NAME, messageToDelete.id));
      toast({ title: "Message Deleted" });
    } catch (error) {
      console.error("Error deleting message: ", error);
      toast({ title: "Error Deleting Message", description: (error instanceof Error ? error.message : "Unknown error"), variant: "destructive" });
    }
    setIsDeleteMessageDialogOpen(false);
    setMessageToDelete(null);
  };

  const handleStartReply = (msg: Message) => setReplyingTo(msg);

  if (!isNameSet) {
    return (
      <div className="flex flex-col items-center justify-center flex-grow p-4">
        <form onSubmit={handleNameSubmit} className="w-full max-w-sm space-y-4 p-6 bg-card rounded-lg shadow-md">
          <h2 className="text-xl font-semibold text-center">Enter Your Name</h2>
          <Input type="text" value={userName} onChange={(e) => setUserName(e.target.value)} placeholder="Your name" required className="text-base" />
          <Button type="submit" className="w-full">Start Chatting</Button>
        </form>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-grow max-w-2xl mx-auto w-full bg-card shadow-lg rounded-lg overflow-hidden">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
            <div>
                <h2 className="text-xl font-semibold">Gameplan</h2>
                <div className="flex items-center text-sm text-muted-foreground">
                    <Users className="h-4 w-4 mr-1.5" />
                    {activeUserCount !== null ? `Active: ${activeUserCount}` : 'Loading...'}
                    <span className="mx-1.5">·</span>
                    <span>Chatting as: {userName}</span>
                </div>
                 {typingUsersDisplay && (
                    <p className="text-xs text-muted-foreground mt-0.5 animate-pulse h-4">{typingUsersDisplay}</p>
                 )}
            </div>
            <div className="flex items-center space-x-2">
            <AlertDialog open={isClearChatDialogOpen} onOpenChange={setIsClearChatDialogOpen}>
                <AlertDialogTrigger asChild>
                <Button variant="outline" size="icon" aria-label="Clear chat"><Trash2 className="h-4 w-4" /></Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will delete all messages.</AlertDialogDescription></AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleClearChat} className="bg-destructive hover:bg-destructive/90">Clear Chat</AlertDialogAction>
                </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <Link href="/" passHref legacyBehavior>
                <Button variant="outline" size="sm" asChild><a><Gamepad2 className="mr-2 h-4 w-4" />Go to Game</a></Button>
            </Link>
            </div>
        </div>
      </div>
      <ScrollArea className="flex-grow p-4 min-h-0" ref={scrollAreaRef}>
        <div className="space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              id={`message-${msg.id}`}
              className={`group flex items-end space-x-2 ${msg.sender === userName ? 'justify-end' : 'justify-start'}`}
            >
              {msg.sender !== userName && (
                <Avatar className="h-8 w-8 self-start">
                  <AvatarFallback>{msg.sender.substring(0, 1).toUpperCase()}</AvatarFallback>
                </Avatar>
              )}
              <div className={`relative max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg px-3 py-2 rounded-lg shadow ${msg.sender === userName ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'}`}>
                {msg.replyTo && (
                  <div className={`mb-1.5 p-1.5 rounded-md text-xs border-l-2 ${msg.sender === userName ? 'bg-primary/80 border-primary-foreground/50' : 'bg-secondary/80 border-secondary-foreground/50'}`}>
                    <p className="font-semibold">{msg.replyTo.senderName}</p>
                    <p className="truncate opacity-80">{msg.replyTo.messageText}</p>
                  </div>
                )}
                <p className="text-sm font-medium break-words">{msg.text}</p>
                
                {msg.sender === userName ? (
                  <div className="text-xs mt-1 text-primary-foreground/70 text-right flex items-center justify-end space-x-1">
                    <span>
                      {msg.createdAt && typeof msg.createdAt.toDate === 'function'
                        ? format(msg.createdAt.toDate(), 'HH:mm')
                        : 'Sending...'}
                    </span>
                    {msg.createdAt && typeof msg.createdAt.toDate === 'function' && ( // Message sent
                       (msg.readBy && Object.keys(msg.readBy).some(reader => reader !== userName && msg.readBy[reader])) ? ( // Seen by at least one other
                        <CheckCheck className="h-4 w-4 text-blue-400" />
                      ) : ( // Sent but not seen by others yet
                        <Check className="h-4 w-4" />
                      )
                    )}
                  </div>
                ) : (
                  <p className="text-xs mt-1 text-muted-foreground">
                    {`${msg.sender} • `}
                    {msg.createdAt && typeof msg.createdAt.toDate === 'function'
                      ? format(msg.createdAt.toDate(), 'HH:mm')
                      : 'Sending...'}
                  </p>
                )}
              </div>
              <div className={`opacity-0 group-hover:opacity-100 transition-opacity self-start ${msg.sender === userName ? 'order-first mr-1' : 'ml-1'}`}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-6 w-6 p-0"><MoreVertical className="h-4 w-4" /><span className="sr-only">Opt</span></Button></DropdownMenuTrigger>
                  <DropdownMenuContent align={msg.sender === userName ? "end" : "start"}>
                    <DropdownMenuItem onClick={() => handleStartReply(msg)}><Reply className="mr-2 h-4 w-4" />Reply</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleCopyMessage(msg.text)}><Copy className="mr-2 h-4 w-4" />Copy</DropdownMenuItem>
                    {msg.sender === userName && (<DropdownMenuItem onClick={() => openDeleteMessageDialog(msg)} className="text-destructive focus:text-destructive"><MessageSquareX className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>)}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              {msg.sender === userName && (
                <Avatar className="h-8 w-8 self-start">
                   <AvatarFallback>{userName.substring(0,1).toUpperCase()}</AvatarFallback>
                </Avatar>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>
      <div className="border-t bg-background">
        {replyingTo && (
          <div className="p-2.5 border-b bg-secondary/30 text-sm flex justify-between items-center">
            <div>
              <p className="font-semibold text-xs text-muted-foreground">Replying to: {replyingTo.sender}</p>
              <p className="text-sm truncate italic">"{replyingTo.text}"</p>
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setReplyingTo(null)}><X className="h-4 w-4" /><span className="sr-only">Cancel</span></Button>
          </div>
        )}
        <form onSubmit={handleSendMessage} className="p-4 flex items-center space-x-2">
          <Input
            type="text"
            value={newMessage}
            onChange={handleNewMessageInputChange}
            placeholder="Type message..."
            className="flex-grow text-base"
            aria-label="Chat message input"
          />
          <Button type="submit" size="icon" aria-label="Send" disabled={!newMessage.trim()}><Send className="h-5 w-5" /></Button>
        </form>
      </div>
      <AlertDialog open={isDeleteMessageDialogOpen} onOpenChange={setIsDeleteMessageDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete message?</AlertDialogTitle><AlertDialogDescription>This will be deleted for everyone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setMessageToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteMessage} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
