import { useState } from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TagInput } from './TagInput'

function TagInputHarness() {
  const [tags, setTags] = useState<string[]>([])
  return (
    <TagInput
      tags={tags}
      suggestions={['Hike', 'High Altitude']}
      onChange={setTags}
    />
  )
}

describe('TagInput', () => {
  it('adds free text tags with enter and removes tags', async () => {
    const user = userEvent.setup()

    render(<TagInputHarness />)

    const input = screen.getByPlaceholderText('Type a tag and press Enter')
    await user.type(input, 'Canoeing{enter}')
    expect(screen.getByText('Canoeing')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Remove Canoeing' }))
    expect(screen.queryByText('Canoeing')).not.toBeInTheDocument()
  })

  it('prevents duplicate tags', async () => {
    const user = userEvent.setup()

    render(<TagInputHarness />)

    const input = screen.getByPlaceholderText('Type a tag and press Enter')
    await user.type(input, 'Hike{enter}')
    await user.type(input, 'hike{enter}')

    expect(screen.getAllByText('Hike')).toHaveLength(1)
  })
})
