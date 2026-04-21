import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CreateRecipeDialog } from './CreateRecipeDialog'
import { Recipe } from '@/lib/types'

vi.mock('@/components/AuthProvider', () => ({
  useAuthContext: () => ({ troopId: 'troop-1' }),
}))

describe('CreateRecipeDialog', () => {
  const baseRecipe: Recipe = {
    id: 'recipe-1',
    troopId: 'troop-1',
    name: 'Camp Chili',
    description: 'Warm and easy',
    servings: 6,
    ingredients: [{ id: 'ing-1', name: 'Beans', quantity: 1, unit: 'can' }],
    variations: [{
      id: 'var-1',
      cookingMethod: 'camp-stove',
      instructions: ['Simmer for 20 minutes', ''],
      equipment: ['Pot', ''],
    }],
    createdAt: 1,
    updatedAt: 2,
    currentVersion: 1,
    versions: [],
  }

  it('hides cooking variation controls in edit mode', () => {
    render(
      <CreateRecipeDialog
        open={true}
        onOpenChange={vi.fn()}
        onCreateRecipe={vi.fn()}
        initialRecipe={baseRecipe}
      />
    )

    expect(screen.queryByText('Cooking Variation')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save Changes' })).toBeInTheDocument()
  })

  it('preserves existing variations unchanged when saving edits', async () => {
    const onCreateRecipe = vi.fn()
    const user = userEvent.setup()

    render(
      <CreateRecipeDialog
        open={true}
        onOpenChange={vi.fn()}
        onCreateRecipe={onCreateRecipe}
        initialRecipe={baseRecipe}
      />
    )

    await user.click(screen.getByRole('button', { name: 'Save Changes' }))

    expect(onCreateRecipe).toHaveBeenCalledTimes(1)
    expect(onCreateRecipe.mock.calls[0][0].variations).toEqual(baseRecipe.variations)
  })
})
