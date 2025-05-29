
import Header from '@/components/Header';

export default function AboutPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="bg-card p-8 rounded-lg shadow-md">
          <h1 className="text-3xl font-bold mb-6 text-center">About This App</h1>
          <p className="text-lg mb-4">
            Welcome to Naughts & Crosses Communicator! This application combines a classic game of Tic-Tac-Toe
            with a hidden, secure chat feature.
          </p>
          <p className="text-lg mb-4">
            The primary goal is to provide a fun way to play a simple game while also having a private
            communication channel.
          </p>
          <p className="text-lg">
            Built with Next.js, Tailwind CSS, ShadCN UI components, and Firebase for real-time chat functionality.
          </p>
        </div>
      </main>
      <footer className="py-4 text-center text-sm text-muted-foreground border-t">
        Naughts & Crosses Communicator &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}
