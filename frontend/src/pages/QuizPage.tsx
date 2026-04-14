import { useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import Navbar from '../components/ui/navbar'
import QuizCard from '../components/quiz/QuizCard'
import ScoreScreen from '../components/quiz/ScoreScreen'

interface QuizQuestion {
  questionNumber: number
  imageUrl: string
  correctId: string
  choices: { id: string; common_name: string }[]
}

interface QuizData {
  total: number
  questions: QuizQuestion[]
}

type GameState = 'playing' | 'done'

export default function QuizPage() {
  const [gameKey, setGameKey] = useState(0) // increment to restart
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [score, setScore] = useState(0)
  const [gameState, setGameState] = useState<GameState>('playing')

  const { data, isLoading, isError } = useQuery<QuizData>({
    queryKey: ['quiz', gameKey],
    queryFn: async () => {
      const res = await fetch('/api/quiz?count=5')
      if (!res.ok) throw new Error('Failed to load quiz')
      return res.json()
    },
    staleTime: Infinity, // don't refetch mid-game
    retry: 1,
  })

  const handleAnswer = useCallback((id: string) => {
    if (selectedId !== null || !data) return // already answered
    setSelectedId(id)
    if (id === data.questions[currentIndex].correctId) {
      setScore(s => s + 1)
    }
  }, [selectedId, data, currentIndex])

  const handleNext = useCallback(() => {
    if (!data) return
    if (currentIndex + 1 >= data.questions.length) {
      setGameState('done')
    } else {
      setCurrentIndex(i => i + 1)
      setSelectedId(null)
    }
  }, [currentIndex, data])

  const handlePlayAgain = useCallback(() => {
    setGameKey(k => k + 1)
    setCurrentIndex(0)
    setSelectedId(null)
    setScore(0)
    setGameState('playing')
  }, [])

  const currentQuestion = data?.questions[currentIndex]
  const answered = selectedId !== null

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden">
      <Navbar activePage="quiz" />

      <main className="flex-1 overflow-y-auto bg-background">
        <div className="max-w-2xl mx-auto px-4 py-12">

          {/* Header */}
          <div className="text-center mb-10">
            <h1 className="text-2xl font-bold text-foreground">Animal ID Quiz</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Can you identify the animal from its photo?
            </p>
          </div>

          {/* Loading */}
          {isLoading && (
            <div className="flex flex-col items-center gap-4 text-muted-foreground">
              <div className="h-10 w-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
              <p className="text-sm">Loading quiz...</p>
            </div>
          )}

          {/* Error */}
          {isError && (
            <div className="text-center space-y-3">
              <p className="text-red-500 text-sm">
                Couldn't load the quiz. Make sure species have images by browsing the map first.
              </p>
              <button
                onClick={handlePlayAgain}
                className="text-sm text-primary underline"
              >
                Try again
              </button>
            </div>
          )}

          {/* Game */}
          {!isLoading && !isError && data && gameState === 'playing' && currentQuestion && (
            <div className="flex flex-col items-center gap-6">
              <QuizCard
                questionNumber={currentQuestion.questionNumber}
                total={data.total}
                imageUrl={currentQuestion.imageUrl}
                choices={currentQuestion.choices}
                selectedId={selectedId}
                correctId={currentQuestion.correctId}
                onAnswer={handleAnswer}
              />

              {/* Next button — only shows after answering */}
              {answered && (
                <button
                  onClick={handleNext}
                  className="mt-2 rounded-xl bg-primary px-8 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  {currentIndex + 1 >= data.total ? 'See Results' : 'Next →'}
                </button>
              )}
            </div>
          )}

          {/* Score screen */}
          {gameState === 'done' && data && (
            <ScoreScreen
              score={score}
              total={data.total}
              onPlayAgain={handlePlayAgain}
            />
          )}
        </div>
      </main>
    </div>
  )
}
