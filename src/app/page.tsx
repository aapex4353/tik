
import Header from '@/components/Header';
import TicTacToeBoard from '@/components/TicTacToeBoard';

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-grow flex flex-col items-stretch p-1 sm:p-2 md:p-4"> {/* Adjust padding for more space */}
        {/* Visually hidden image for AI hint for app icon */}
        <img
          src="https://placehold.co/48x48.png" 
          alt="App icon hint"
          className="hidden"
          data-ai-hint="game controller" 
        />
        <TicTacToeBoard />
      </main>
      <footer className="py-2 text-center text-xs text-muted-foreground border-t">
        All Games &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}
