import { Star } from '@phosphor-icons/react'

interface StarRatingProps {
  value: number
  onChange?: (value: number) => void
  maxStars?: number
  readonly?: boolean
  size?: number
}

export function StarRating({ 
  value, 
  onChange, 
  maxStars = 5, 
  readonly = false,
  size = 20
}: StarRatingProps) {
  const handleClick = (rating: number) => {
    if (!readonly && onChange) {
      onChange(rating)
    }
  }

  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: maxStars }, (_, i) => i + 1).map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => handleClick(star)}
          disabled={readonly}
          className={`transition-colors ${
            readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'
          }`}
        >
          <Star
            size={size}
            weight={star <= value ? 'fill' : 'regular'}
            className={star <= value ? 'text-accent' : 'text-muted-foreground'}
          />
        </button>
      ))}
    </div>
  )
}
