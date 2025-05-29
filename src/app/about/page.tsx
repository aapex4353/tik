
import Header from '@/components/Header';

export default function AboutPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="bg-card p-8 rounded-lg shadow-md">
          <h1 className="text-3xl font-bold mb-6 text-center">About All Games</h1>
          <p className="text-lg mb-4">
            Welcome to All Games! This application offers a classic Tic-Tac-Toe experience with multiple ways to play.
          </p>
          <p className="text-lg mb-4">
            Challenge yourself against our AI with varying difficulty levels (Easy, Medium, and Impossible), or connect
            with a friend for an online multiplayer match.
          </p>
          <p className="text-lg mb-4">
            The game features real-time updates for online play, clear win/draw detection, and an intuitive interface.
          </p>
          <p className="text-lg">
            Built with Next.js, Tailwind CSS, and ShadCN UI components.
          </p>
        </div>
      </main>
      <footer className="py-4 text-center text-sm text-muted-foreground border-t">
        All Games &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}
