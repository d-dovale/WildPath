interface Choice {
  id: string
  common_name: string
}

interface Props {
  questionNumber: number
  total: number
  imageUrl: string
  choices: Choice[]
  selectedId: string | null
  correctId: string
  onAnswer: (id: string) => void
}

export default function QuizCard({
  questionNumber,
  total,
  imageUrl,
  choices,
  selectedId,
  correctId,
  onAnswer,
}: Props) {
  const answered = selectedId !== null

  function getButtonStyle(id: string) {
    if (!answered) {
      return 'border-2 border-muted bg-card hover:border-primary hover:bg-primary/5 text-foreground'
    }
    if (id === correctId) {
      return 'border-2 border-green-500 bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-200'
    }
    if (id === selectedId) {
      return 'border-2 border-red-400 bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200'
    }
    return 'border-2 border-muted bg-card text-muted-foreground opacity-50'
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-lg mx-auto">
      {/* Progress */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>Question {questionNumber} of {total}</span>
        <div className="flex gap-1">
          {Array.from({ length: total }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 w-8 rounded-full transition-colors ${
                i < questionNumber - 1
                  ? 'bg-primary'
                  : i === questionNumber - 1
                  ? 'bg-primary/50'
                  : 'bg-muted'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Animal image */}
      <div className="rounded-2xl overflow-hidden border shadow-sm aspect-video bg-muted">
        <img
          src={imageUrl}
          alt="Mystery animal"
          className="w-full h-full object-cover"
        />
      </div>

      {/* Question prompt */}
      <p className="text-center font-semibold text-lg text-foreground">
        What animal is this?
      </p>

      {/* Answer choices */}
      <div className="grid grid-cols-2 gap-3">
        {choices.map((choice) => (
          <button
            key={choice.id}
            disabled={answered}
            onClick={() => onAnswer(choice.id)}
            className={`rounded-xl px-4 py-3 text-sm font-medium text-left transition-all ${getButtonStyle(choice.id)}`}
          >
            {choice.common_name}
          </button>
        ))}
      </div>

      {/* Feedback */}
      {answered && (
        <p className={`text-center text-sm font-medium ${selectedId === correctId ? 'text-green-600' : 'text-red-500'}`}>
          {selectedId === correctId
            ? '✓ Correct!'
            : `✗ It was the ${choices.find(c => c.id === correctId)?.common_name}`}
        </p>
      )}
    </div>
  )
}
