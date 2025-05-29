
import Header from '@/components/Header';
import { CheckCircle } from 'lucide-react';

export default function FeaturesPage() {
  const features = [
    "Classic Tic-Tac-Toe game board.",
    "Play against AI with multiple difficulty levels (Easy, Medium, Impossible).",
    "Play online with a friend in real-time.",
    "Clear player turns and win/draw detection.",
    "Game reset and retry functionality.",
    "User-friendly interface with responsive design for all devices.",
    "Modern UI built with ShadCN components and Tailwind CSS.",
  ];

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="bg-card p-8 rounded-lg shadow-md">
          <h1 className="text-3xl font-bold mb-8 text-center">App Features</h1>
          <ul className="space-y-4">
            {features.map((feature, index) => (
              <li key={index} className="flex items-start text-lg">
                <CheckCircle className="h-6 w-6 text-primary mr-3 mt-1 flex-shrink-0" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>
      </main>
      <footer className="py-4 text-center text-sm text-muted-foreground border-t">
        All Games &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}
