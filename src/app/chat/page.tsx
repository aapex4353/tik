
import ChatClient from './ChatClient'; // Ensure this path is correct

export default function ChatPage() {
  return (
    <div className="flex flex-col min-h-screen h-screen overflow-hidden"> {/* Ensure full viewport height and prevent body scroll */}
      {/* The main <Header /> component is intentionally removed from this page */}
      <main className="flex-grow container mx-auto px-2 py-4 md:px-4 md:py-0 flex flex-col items-center overflow-hidden"> {/* Adjusted padding and flex for ChatClient */}
        {/*
          Instructions for Firestore Setup:
          1. Go to your Firebase project console.
          2. Navigate to Firestore Database.
          3. Create a database if you haven't already.
          4. For querying by 'roomId' and ordering by 'createdAt', Firestore might prompt you to create a composite index.
             If you use the collection name pattern 'chat_room123', you only need to order by 'createdAt'.
             If you use a generic 'messages' collection and filter by 'roomId', a composite index on (roomId ASC, createdAt ASC) for the 'messages' collection will be needed.
             The current ChatClient.tsx uses a collection name like 'chat_room123', so an explicit composite index for roomId might not be required, only for createdAt.
          5. Ensure your Firestore security rules allow read/write access appropriately. For development, you might use:
             rules_version = '2';
             service cloud.firestore {
               match /databases/{database}/documents {
                 match /{document=**} { // Be more specific for production
                   allow read, write: if true; // WARNING: Insecure for production
                 }
               }
             }
             For production, restrict access, e.g., allow write if request.auth != null, etc.
        */}
        <ChatClient />
      </main>
    </div>
  );
}
