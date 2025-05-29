
"use client";

import { useState, useEffect, useCallback, useMemo } from 'react'; // Added useMemo
import { doc, setDoc, onSnapshot, type DocumentData }from 'firebase/firestore';
import { db } from '@/lib/firebase';
import TicTacToeCell from './TicTacToeCell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { RotateCcw, Circle, XIcon as XLucideIcon, Users, Bot } from 'lucide-react';
import { cn } from '@/lib/utils';

type Player = 'X' | 'O';
type Board = (Player | null)[];
type GameMode = null | 'online' | 'ai';
type AiDifficulty = null | 'easy' | 'medium' | 'impossible';

interface BaseGameState {
  board: Board;
  winner: Player | 'Draw' | null;
  winningLine: number[] | null;
}

interface OnlineGameState extends BaseGameState {
  currentPlayer: Player;
  playerX_taken: boolean;
  playerO_taken: boolean;
}

interface AiGameState extends BaseGameState {
  humanPlayer: Player;
  aiPlayer: Player;
  currentPlayer: Player;
  isAiThinking: boolean;
  aiDifficulty: AiDifficulty;
}

const winningCombinations = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
  [0, 4, 8], [2, 4, 6],             // diagonals
];

const DEFAULT_GAME_ID = "ticTacToe_default_game";
const GAME_COLLECTION_NAME = "ticTacToeGames";

const initialOnlineGameState: OnlineGameState = {
  board: Array(9).fill(null),
  currentPlayer: 'X',
  winner: null,
  winningLine: null,
  playerX_taken: false,
  playerO_taken: false,
};

function calculateWinner(board: Board): { winner: Player | null, line: number[] | null } {
  for (let i = 0; i < winningCombinations.length; i++) {
    const [a, b, c] = winningCombinations[i];
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a] as Player, line: winningCombinations[i] };
    }
  }
  return { winner: null, line: null };
}

export default function TicTacToeBoard() {
  const [gameMode, setGameMode] = useState<GameMode>(null);

  // Online game state
  const [onlineGameState, setOnlineGameState] = useState<OnlineGameState | null>(null);
  const [localPlayer, setLocalPlayer] = useState<Player | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  
  // Memoize gameDocRef to prevent re-creation on every render
  const gameDocRef = useMemo(() => doc(db, GAME_COLLECTION_NAME, DEFAULT_GAME_ID), []);


  // AI game state
  const [aiGameState, setAiGameState] = useState<AiGameState | null>(null);
  const [selectedAiDifficulty, setSelectedAiDifficulty] = useState<AiDifficulty>(null);


  const [status, setStatus] = useState<string>("Choose a game mode.");

  // --- Online Game Logic ---
  const initializeOnlineGameInFirestore = useCallback(async () => {
    try {
      await setDoc(gameDocRef, initialOnlineGameState);
    } catch (error) {
      console.error("Error initializing online game:", error);
      setStatus("Error initializing online game. Check console.");
    }
  }, [gameDocRef]); // gameDocRef is now stable

  useEffect(() => {
    if (gameMode !== 'online') return;

    const unsubscribe = onSnapshot(gameDocRef, (docSnap) => {
      if (docSnap.exists()) {
        setOnlineGameState(docSnap.data() as OnlineGameState);
      } else {
        initializeOnlineGameInFirestore();
      }
    }, (error) => {
      console.error("Error listening to online game state:", error);
      setStatus("Error connecting to online game. Check console and Firestore rules.");
    });
    return () => unsubscribe();
  }, [gameMode, gameDocRef, initializeOnlineGameInFirestore]); // Dependencies are now stable

  useEffect(() => {
    if (gameMode !== 'online' || !onlineGameState) {
      if (gameMode === 'online') setStatus("Loading game...");
      return;
    }

    if (onlineGameState.winner) {
      setStatus(onlineGameState.winner === 'Draw' ? "It's a Draw!" : `Player ${onlineGameState.winner} wins!`);
    } else if (onlineGameState.board.every(cell => cell !== null)) {
      setStatus("It's a Draw!");
    } else if (!localPlayer) {
      setStatus("Choose your side to play (X or O).");
    } else {
      setStatus(onlineGameState.currentPlayer === localPlayer ? `Your turn (${localPlayer})` : `Waiting for Player ${onlineGameState.currentPlayer}...`);
    }
  }, [gameMode, onlineGameState, localPlayer]);


  const handleJoinAsPlayer = async (player: Player) => {
    if (!onlineGameState || isJoining) return;
    setIsJoining(true);

    const fieldToUpdate = player === 'X' ? 'playerX_taken' : 'playerO_taken';
    const currentFieldValue = player === 'X' ? onlineGameState.playerX_taken : onlineGameState.playerO_taken;

    if (currentFieldValue && onlineGameState.currentPlayer !== player) { // Check if already taken by someone else
      setStatus(`Player ${player} is already taken.`);
      setIsJoining(false);
      return;
    }

    try {
      await setDoc(gameDocRef, { [fieldToUpdate]: true }, { merge: true });
      setLocalPlayer(player);
    } catch (error) {
      console.error(`Error joining as Player ${player}:`, error);
      setStatus("Error joining game. Try again.");
    }
    setIsJoining(false);
  };

  const handleOnlinePlayerClick = async (index: number) => {
    if (!onlineGameState || !localPlayer || onlineGameState.winner || onlineGameState.board[index] || onlineGameState.currentPlayer !== localPlayer) {
      return;
    }

    const newBoard = [...onlineGameState.board];
    newBoard[index] = localPlayer;
    const { winner, line } = calculateWinner(newBoard);
    let newWinnerState: Player | 'Draw' | null = winner;
    if (!newWinnerState && newBoard.every(cell => cell !== null)) {
      newWinnerState = 'Draw';
    }
    const newCurrentPlayer = localPlayer === 'X' ? 'O' : 'X';

    try {
      await setDoc(gameDocRef, {
        board: newBoard,
        currentPlayer: newCurrentPlayer,
        winner: newWinnerState,
        winningLine: line,
      }, { merge: true });
    } catch (error) {
      console.error("Error updating online game state:", error);
      setStatus("Error making move. Check console.");
    }
  };

  // --- AI Game Logic ---
  const startAiGame = (humanChoice: Player, difficulty: AiDifficulty) => {
    if (!difficulty) return;
    const newAiGameState: AiGameState = {
      board: Array(9).fill(null),
      humanPlayer: humanChoice,
      aiPlayer: humanChoice === 'X' ? 'O' : 'X',
      currentPlayer: 'X', // X always starts
      winner: null,
      winningLine: null,
      isAiThinking: false,
      aiDifficulty: difficulty,
    };
    setAiGameState(newAiGameState);
    updateAiGameStatus(newAiGameState); 

    if (newAiGameState.currentPlayer === newAiGameState.aiPlayer) {
      setAiGameState(prev => prev ? { ...prev, isAiThinking: true } : null);
      setTimeout(() => makeAiMove(newAiGameState), 500);
    }
  };

  const makeAiMove = (currentAiState: AiGameState | null) => {
    if (!currentAiState || currentAiState.winner || currentAiState.currentPlayer !== currentAiState.aiPlayer || !currentAiState.aiDifficulty) {
       if(currentAiState) setAiGameState(prev => prev ? { ...prev, isAiThinking: false } : null);
      return;
    }

    let bestMove = -1;
    const board = [...currentAiState.board];
    const ai = currentAiState.aiPlayer;
    const human = currentAiState.humanPlayer;
    const difficulty = currentAiState.aiDifficulty;

    const getAvailableSpots = (b: Board) => b.map((val, idx) => val === null ? idx : -1).filter(idx => idx !== -1);

    const findWinningOrBlockingMove = (playerToTest: Player, currentBoard: Board): number => {
      for (let i = 0; i < currentBoard.length; i++) {
        if (currentBoard[i] === null) {
          const tempBoard = [...currentBoard];
          tempBoard[i] = playerToTest;
          if (calculateWinner(tempBoard).winner === playerToTest) {
            return i;
          }
        }
      }
      return -1;
    };

    bestMove = findWinningOrBlockingMove(ai, board);

    if (bestMove === -1) {
      bestMove = findWinningOrBlockingMove(human, board);
    }

    if (difficulty === 'easy') {
      if (bestMove === -1) { 
        if (Math.random() < 0.7 || getAvailableSpots(board).length < 2) { 
            const availableSpots = getAvailableSpots(board);
            if (availableSpots.length > 0) {
              bestMove = availableSpots[Math.floor(Math.random() * availableSpots.length)];
            }
        } else { 
            if (board[4] === null) bestMove = 4; 
            else {
                const corners = [0, 2, 6, 8].filter(idx => board[idx] === null);
                if (corners.length > 0) bestMove = corners[Math.floor(Math.random() * corners.length)];
            }
        }
      }
    } else if (difficulty === 'medium') {
      if (bestMove === -1) { 
        if (Math.random() < 0.3 && getAvailableSpots(board).length > 2) { 
            const availableSpots = getAvailableSpots(board);
            if (availableSpots.length > 0) {
                bestMove = availableSpots[Math.floor(Math.random() * availableSpots.length)];
            }
        } else { 
            if (board[4] === null) bestMove = 4; 
            else {
                const corners = [0, 2, 6, 8].filter(idx => board[idx] === null);
                if (corners.length > 0) bestMove = corners[Math.floor(Math.random() * corners.length)];
                else {
                    const sides = [1, 3, 5, 7].filter(idx => board[idx] === null);
                    if (sides.length > 0) bestMove = sides[Math.floor(Math.random() * sides.length)];
                }
            }
        }
      }
    } else if (difficulty === 'impossible') {
        if (bestMove === -1) {
            if (board[4] === null) {
                bestMove = 4;
            } else {
                if (board[0] === human && board[8] === null) bestMove = 8;
                else if (board[2] === human && board[6] === null) bestMove = 6;
                else if (board[6] === human && board[2] === null) bestMove = 2;
                else if (board[8] === human && board[0] === null) bestMove = 0;
                else {
                    const emptyCorners = [0, 2, 6, 8].filter(idx => board[idx] === null);
                    if (emptyCorners.length > 0) {
                        bestMove = emptyCorners[Math.floor(Math.random() * emptyCorners.length)]; 
                    } else {
                        const emptySides = [1, 3, 5, 7].filter(idx => board[idx] === null);
                        if (emptySides.length > 0) {
                            bestMove = emptySides[Math.floor(Math.random() * emptySides.length)];
                        }
                    }
                }
            }
        }
    }

    if (bestMove === -1) {
        const availableSpots = getAvailableSpots(board);
        if (availableSpots.length > 0) {
            bestMove = availableSpots[Math.floor(Math.random() * availableSpots.length)];
        }
    }


    if (bestMove !== -1) {
      const newBoard = [...currentAiState.board];
      newBoard[bestMove] = currentAiState.aiPlayer;
      const { winner, line } = calculateWinner(newBoard);
      let newWinnerState: Player | 'Draw' | null = winner;
      if (!newWinnerState && newBoard.every(cell => cell !== null)) {
        newWinnerState = 'Draw';
      }

      const nextPlayer = currentAiState.humanPlayer;
      const updatedAiState: AiGameState = {
        ...currentAiState,
        board: newBoard,
        currentPlayer: nextPlayer,
        winner: newWinnerState,
        winningLine: line,
        isAiThinking: false,
      };
      setAiGameState(updatedAiState);
      updateAiGameStatus(updatedAiState);
    } else {
       setAiGameState(prev => prev ? { ...prev, isAiThinking: false } : null);
       if (currentAiState.board.every(cell => cell !== null) && !currentAiState.winner) {
           const drawState: AiGameState = {
               ...currentAiState,
               winner: 'Draw',
               isAiThinking: false,
           };
           setAiGameState(drawState);
           updateAiGameStatus(drawState);
       }
    }
  };

  const handleAiPlayerClick = (index: number) => {
    if (!aiGameState || aiGameState.winner || aiGameState.board[index] || aiGameState.currentPlayer !== aiGameState.humanPlayer || aiGameState.isAiThinking) {
      return;
    }

    const newBoard = [...aiGameState.board];
    newBoard[index] = aiGameState.humanPlayer;
    const { winner, line } = calculateWinner(newBoard);
    let newWinnerState: Player | 'Draw' | null = winner;
    if (!newWinnerState && newBoard.every(cell => cell !== null)) {
      newWinnerState = 'Draw';
    }

    const nextPlayer = aiGameState.aiPlayer;
    const updatedAiState: AiGameState = {
      ...aiGameState,
      board: newBoard,
      currentPlayer: nextPlayer,
      winner: newWinnerState,
      winningLine: line,
      isAiThinking: false, 
    };
    setAiGameState(updatedAiState);
    updateAiGameStatus(updatedAiState); 

    if (!newWinnerState) { 
      setAiGameState(prev => prev ? { ...prev, isAiThinking: true } : null);
      updateAiGameStatus({ ...updatedAiState, isAiThinking: true, currentPlayer: aiGameState.aiPlayer }); 
      setTimeout(() => makeAiMove({ ...updatedAiState, currentPlayer: aiGameState.aiPlayer }), 700);
    }
  };

  const updateAiGameStatus = (currentAiState: AiGameState | null) => {
    if (!currentAiState) return;
    if (currentAiState.winner) {
      setStatus(currentAiState.winner === 'Draw' ? "It's a Draw!" : `${currentAiState.winner === currentAiState.humanPlayer ? 'You win!' : 'AI wins!'}`);
    } else { // Removed the board check here as draw is set by game logic
      setStatus(currentAiState.isAiThinking ? `AI (${currentAiState.aiDifficulty}) is thinking...` :
                  currentAiState.currentPlayer === currentAiState.humanPlayer ? `Your turn (${currentAiState.humanPlayer})` : `AI turn (${currentAiState.aiPlayer})`);
    }
  };

  // --- Common Logic & Rendering ---
  const resetGame = () => {
    if (gameMode === 'online') {
      setDoc(gameDocRef, initialOnlineGameState); 
      setLocalPlayer(null); 
    }
    setGameMode(null);
    setSelectedAiDifficulty(null);
    setOnlineGameState(null); 
    setAiGameState(null);     
    setStatus("Choose a game mode.");
  };

  const handleRetry = () => {
    if (gameMode === 'ai' && aiGameState && aiGameState.humanPlayer && aiGameState.aiDifficulty) {
      startAiGame(aiGameState.humanPlayer, aiGameState.aiDifficulty);
    } else if (gameMode === 'online') {
      setDoc(gameDocRef, initialOnlineGameState);
      setLocalPlayer(null);
      setStatus("Game reset. Choose your side (X or O).");
    }
  };

  const PlayerIconDisplay = ({ player }: { player: Player | null }) => {
    if (!player) return null;
    if (player === 'X') return <XLucideIcon className="inline-block h-5 w-5 text-destructive" />;
    if (player === 'O') return <Circle className="inline-block h-5 w-5 text-blue-500" />;
    return null;
  };

  const renderBoardCells = (boardState: BaseGameState, handleClick: (index: number) => void, disabledCondition: (index: number) => boolean) => {
    return boardState.board.map((cell, index) => (
      <TicTacToeCell
        key={index}
        value={cell}
        onClick={() => handleClick(index)}
        disabled={disabledCondition(index)}
        isWinningCell={boardState.winningLine?.includes(index)}
      />
    ));
  };


  if (gameMode === null) {
    return (
      <Card className="w-full flex-grow flex flex-col shadow-xl overflow-hidden">
        <CardHeader className="pb-1 sm:pb-2 pt-2 px-2 md:pb-3">
          <CardTitle className="text-center text-2xl font-bold">Tic-Tac-Toe</CardTitle>
        </CardHeader>
        <CardContent className="flex-grow flex flex-col items-center justify-center space-y-3 p-2 sm:p-4 md:p-6">
          <p className="text-lg text-muted-foreground">Choose your game mode:</p>
          <Button onClick={() => setGameMode('online')} size="lg" className="w-full max-w-xs">
            <Users className="mr-2 h-5 w-5" /> Play Online with Friend
          </Button>
          <Button onClick={() => setGameMode('ai')} size="lg" className="w-full max-w-xs">
            <Bot className="mr-2 h-5 w-5" /> Play with AI
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (gameMode === 'ai' && !selectedAiDifficulty) {
    return (
      <Card className="w-full flex-grow flex flex-col shadow-xl overflow-hidden">
        <CardHeader className="pb-1 sm:pb-2 pt-2 px-2 md:pb-3">
          <CardTitle className="text-center text-2xl font-bold">Play with AI</CardTitle>
        </CardHeader>
        <CardContent className="flex-grow flex flex-col items-center justify-center space-y-2 p-2 sm:p-4 md:p-6">
          <p className="text-lg text-muted-foreground mb-2">Choose AI Difficulty:</p>
          <Button onClick={() => setSelectedAiDifficulty('easy')} size="lg" className="w-full max-w-xs">
            Easy
          </Button>
          <Button onClick={() => setSelectedAiDifficulty('medium')} size="lg" className="w-full max-w-xs">
            Medium
          </Button>
          <Button onClick={() => setSelectedAiDifficulty('impossible')} size="lg" className="w-full max-w-xs">
            Impossible
          </Button>
        </CardContent>
        <CardFooter className="flex flex-col items-center pt-1 sm:pt-2 pb-2 px-2 md:pt-3 border-t">
          <Button onClick={resetGame} variant="outline" size="sm" className="w-full max-w-xs">
            Back to Mode Select
          </Button>
        </CardFooter>
      </Card>
    );
  }

  if (gameMode === 'ai' && selectedAiDifficulty && !aiGameState?.humanPlayer) {
     return (
      <Card className="w-full flex-grow flex flex-col shadow-xl overflow-hidden">
        <CardHeader className="pb-1 sm:pb-2 pt-2 px-2 md:pb-3">
          <CardTitle className="text-center text-2xl font-bold">Play with AI ({selectedAiDifficulty})</CardTitle>
        </CardHeader>
        <CardContent className="flex-grow flex flex-col items-center justify-center space-y-3 p-2 sm:p-4 md:p-6">
          <p className="text-lg text-muted-foreground">Choose your mark:</p>
          <Button onClick={() => startAiGame('X', selectedAiDifficulty)} size="lg" className="w-full max-w-xs">
            <XLucideIcon className="mr-2 h-5 w-5" /> Play as X
          </Button>
          <Button onClick={() => startAiGame('O', selectedAiDifficulty)} size="lg" className="w-full max-w-xs">
            <Circle className="mr-2 h-5 w-5" /> Play as O
          </Button>
        </CardContent>
         <CardFooter className="flex flex-col items-center pt-1 sm:pt-2 pb-2 px-2 md:pt-3 border-t">
            <Button onClick={resetGame} variant="outline" size="sm" className="w-full max-w-xs">
             Back to Mode Select
            </Button>
        </CardFooter>
      </Card>
    );
  }

  if (gameMode === 'online' && !onlineGameState) {
    return (
      <Card className="w-full flex-grow flex flex-col shadow-xl overflow-hidden">
        <CardHeader className="pb-1 sm:pb-2 pt-2 px-2 md:pb-3">
          <CardTitle className="text-center text-2xl font-bold">Tic-Tac-Toe Online</CardTitle>
        </CardHeader>
        <CardContent className="flex-grow flex flex-col items-center justify-center space-y-6 py-10 p-2 sm:p-4 md:p-6">
          <p className="text-muted-foreground">{status}</p>
          <div className="h-48 flex items-center justify-center">
            <svg className="animate-spin h-10 w-10 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col items-center pt-1 sm:pt-2 pb-2 px-2 md:pt-3 border-t">
            <Button onClick={resetGame} variant="outline" size="sm" className="w-full max-w-xs">
             Back to Mode Select
            </Button>
        </CardFooter>
      </Card>
    );
  }

  const isGameOver = (gameMode === 'online' && onlineGameState?.winner) || (gameMode === 'ai' && aiGameState?.winner);
  const currentBoardState = gameMode === 'online' ? onlineGameState : aiGameState;

  return (
    <Card className="w-full flex-grow flex flex-col shadow-xl overflow-hidden">
      <CardHeader className="pb-1 sm:pb-2 pt-2 px-2 md:pb-3">
        <CardTitle className="text-center text-xl sm:text-2xl font-bold">
          {gameMode === 'online' ? 'Tic-Tac-Toe Online' : `vs AI (${aiGameState?.aiDifficulty || selectedAiDifficulty})`}
        </CardTitle>
        {gameMode === 'online' && localPlayer && (
          <p className="text-center text-xs sm:text-sm text-muted-foreground">Playing as <PlayerIconDisplay player={localPlayer} /></p>
        )}
        {gameMode === 'ai' && aiGameState?.humanPlayer && (
          <p className="text-center text-xs sm:text-sm text-muted-foreground">You: <PlayerIconDisplay player={aiGameState.humanPlayer} />, AI: <PlayerIconDisplay player={aiGameState.aiPlayer} /></p>
        )}
      </CardHeader>

      <CardContent className="flex-grow flex flex-col items-center justify-center p-1 space-y-1 sm:space-y-2">
        {gameMode === 'online' && onlineGameState && !localPlayer && !onlineGameState.winner && (
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 my-2 w-full max-w-xs">
            <Button
              onClick={() => handleJoinAsPlayer('X')}
              disabled={onlineGameState.playerX_taken || isJoining}
              variant="outline"
              size="lg"
              className="w-full text-base"
            >
              <XLucideIcon className="mr-2 h-5 w-5" /> Join as X
            </Button>
            <Button
              onClick={() => handleJoinAsPlayer('O')}
              disabled={onlineGameState.playerO_taken || isJoining}
              variant="outline"
              size="lg"
              className="w-full text-base"
            >
              <Circle className="mr-2 h-5 w-5" /> Join as O
            </Button>
          </div>
        )}
        
        {currentBoardState && (
          <div className="w-full max-w-[90vmin] sm:max-w-[85vmin] md:max-w-[75vmin] lg:max-w-[65vmin] aspect-square mx-auto">
            <div className="grid grid-cols-3 gap-1 w-full h-full bg-muted rounded-none shadow-inner">
              {gameMode === 'online' && onlineGameState &&
                renderBoardCells(onlineGameState, handleOnlinePlayerClick, (index) =>
                  !localPlayer ||
                  onlineGameState.currentPlayer !== localPlayer ||
                  !!onlineGameState.winner ||
                  !!onlineGameState.board[index]
                )
              }
              {gameMode === 'ai' && aiGameState &&
                renderBoardCells(aiGameState, handleAiPlayerClick, (index) =>
                  !!aiGameState.winner ||
                  !!aiGameState.board[index] ||
                  aiGameState.currentPlayer !== aiGameState.humanPlayer ||
                  aiGameState.isAiThinking
                )
              }
            </div>
          </div>
        )}

        <div className="text-xs sm:text-sm font-medium h-6 sm:h-8 flex items-center justify-center text-center text-muted-foreground px-1">
           {status.includes("Your turn") && gameMode === 'online' && localPlayer ? (
            <>Your turn (<PlayerIconDisplay player={localPlayer} />)</>
          ) : status.includes("Your turn") && gameMode === 'ai' && aiGameState ? (
            <>Your turn (<PlayerIconDisplay player={aiGameState.humanPlayer} />)</>
          ) : status.includes("Waiting for Player") && onlineGameState ? (
            <>Waiting for Player <PlayerIconDisplay player={onlineGameState.currentPlayer} />...</>
          ) : (
            status
          )}
        </div>
      </CardContent>

      <CardFooter className="flex flex-col items-center space-y-1 sm:space-y-2 pt-1 sm:pt-2 pb-2 px-2 border-t">
        {isGameOver && (
          <Button onClick={handleRetry} variant="outline" size="sm" className="w-full max-w-xs">
            <RotateCcw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        )}
        <Button
          onClick={resetGame}
          variant={isGameOver ? "default" : "destructive" }
          size="sm"
          className="w-full max-w-xs"
        >
          <RotateCcw className="mr-2 h-4 w-4" />
           { isGameOver ? 'New Game' : 'Reset Game / Change Mode'}
        </Button>
        {gameMode === 'online' && (
            <p className="text-xs text-muted-foreground mt-1">
                Game ID: <span className="font-mono">{DEFAULT_GAME_ID.split('_')[1]}</span>
            </p>
        )}
      </CardFooter>
    </Card>
  );
}

    

    