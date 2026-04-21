import { useId, useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { X } from '@phosphor-icons/react'

interface TagInputProps {
  tags: string[]
  suggestions: string[]
  onChange: (tags: string[]) => void
  placeholder?: string
}

function normalizeTag(value: string) {
  return value.trim().replace(/\s+/g, ' ')
}

function hasTag(tags: string[], value: string) {
  return tags.some((tag) => tag.toLowerCase() === value.toLowerCase())
}

export function TagInput({ tags, suggestions, onChange, placeholder = 'Type a tag and press Enter' }: TagInputProps) {
  const [inputValue, setInputValue] = useState('')
  const listId = useId()

  const filteredSuggestions = useMemo(() => {
    const query = inputValue.trim().toLowerCase()
    return suggestions.filter((suggestion) => {
      if (hasTag(tags, suggestion)) return false
      if (!query) return true
      return suggestion.toLowerCase().includes(query)
    })
  }, [inputValue, suggestions, tags])

  const addTag = (rawValue: string) => {
    const next = normalizeTag(rawValue)
    if (!next || hasTag(tags, next)) return
    onChange([...tags, next])
    setInputValue('')
  }

  const removeTag = (tagToRemove: string) => {
    onChange(tags.filter((tag) => tag.toLowerCase() !== tagToRemove.toLowerCase()))
  }

  return (
    <div className="grid gap-2">
      <Input
        list={listId}
        value={inputValue}
        placeholder={placeholder}
        onChange={(event) => setInputValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key !== 'Enter') return
          event.preventDefault()
          addTag(inputValue)
        }}
      />
      <datalist id={listId}>
        {filteredSuggestions.map((tag) => (
          <option key={tag} value={tag} />
        ))}
      </datalist>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="gap-1 pr-1">
              <span>{tag}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-4 w-4 hover:bg-transparent"
                aria-label={`Remove ${tag}`}
                onClick={() => removeTag(tag)}
              >
                <X size={12} />
              </Button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}
