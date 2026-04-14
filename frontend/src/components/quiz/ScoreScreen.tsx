interface Props {
  score: number
  total: number
  onPlayAgain: () => void
}

function getMessage(score: number, total: number) {
  const ratio = score / total
  if (ratio === 1) return { emoji: '🏆', text: 'Perfect score! You\'re a wildlife expert!' }
  if (ratio >= 0.8) return { emoji: '🌿', text: 'Great job! You really know your animals.' }
  if (ratio >= 0.6) return { emoji: '🐾', text: 'Not bad! Keep exploring WildPath.' }
  if (ratio >= 0.4) return { emoji: '🔭', text: 'Getting there! Try again to improve.' }
  return { emoji: '🌱', text: 'Keep learning! The wild has a lot to teach.' }
}

export default function ScoreScreen({ score, total, onPlayAgain }: Props) {
  const { emoji, text } = getMessage(score, total)

  return (
    <div className="flex flex-col items-center gap-8 w-full max-w-sm mx-auto text-center">
      <div className="text-6xl">{emoji}</div>

      <div>
        <p className="text-5xl font-bold text-foreground">
          {score}
          <span className="text-3xl text-muted-foreground font-normal">/{total}</span>
        </p>
        <p className="text-muted-foreground mt-2 text-sm">{text}</p>
      </div>

      <button
        onClick={onPlayAgain}
        className="w-full rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        Play Again
      </button>
    </div>
  )
}
