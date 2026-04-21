import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RecipeDetailDialog } from './RecipeDetailDialog'
import type { Recipe } from '@/lib/types'
import { useRecipeFeedback } from '@/hooks/useFeedback'
import { __setFeatureFlagsForTests } from '@/lib/featureFlags'

vi.mock('@/hooks/useFeedback', () => ({
  useRecipeFeedback: vi.fn(),
}))

const recipe: Recipe = {
  id: 'recipe-1',
  troopId: 'troop-1',
  name: 'Camp Chili',
  servings: 8,
  ingredients: [
    { id: 'ing-1', name: 'Beans', quantity: 2, unit: 'can' },
    { id: 'ing-2', name: 'Chili Powder', quantity: 1, unit: 'tbsp' },
  ],
  variations: [
    {
      id: 'var-1',
      cookingMethod: 'camp-stove',
      instructions: ['Heat pot', 'Simmer ingredients'],
      equipment: ['Pot', 'Spoon'],
    },
  ],
  createdAt: Date.now(),
  updatedAt: Date.now(),
  currentVersion: 1,
  versions: [],
}

describe('RecipeDetailDialog', () => {
  const onOpenChange = vi.fn()
  const onUpdateRecipe = vi.fn()
  const printSpy = vi.fn()

  beforeEach(() => {
    __setFeatureFlagsForTests({ 'enable-print-recipes': true })
    vi.stubGlobal('print', printSpy)
    vi.mocked(useRecipeFeedback).mockReturnValue({
      data: [],
      isLoading: false,
    } as any)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('prints recipe details when print button is clicked', async () => {
    render(
      <RecipeDetailDialog
        recipe={recipe}
        open
        onOpenChange={onOpenChange}
        onUpdateRecipe={onUpdateRecipe}
      />
    )

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Print' }))

    expect(printSpy).toHaveBeenCalledTimes(1)
  })

  it('renders print-only recipe details and marks interactive UI as no-print', () => {
    render(
      <RecipeDetailDialog
        recipe={recipe}
        open
        onOpenChange={onOpenChange}
        onUpdateRecipe={onUpdateRecipe}
      />
    )

    const printOnlySection = document.body.querySelector('.print-only')
    expect(printOnlySection).not.toBeNull()
    expect(printOnlySection).toHaveTextContent('Instructions')
    expect(printOnlySection).toHaveTextContent('Equipment Needed')
    expect(printOnlySection).toHaveTextContent('Heat pot')
    expect(printOnlySection).toHaveTextContent('Pot')

    const printButton = screen.getByRole('button', { name: 'Print' })
    expect(printButton.closest('.no-print')).not.toBeNull()

    const screenAccordion = document.body.querySelector('.w-full.no-print')
    expect(screenAccordion).not.toBeNull()

    const noPrintElements = document.body.querySelectorAll('.no-print')
    expect(noPrintElements.length).toBeGreaterThanOrEqual(2)
  })

  it('renders recipe feedback history with event attribution', () => {
    vi.mocked(useRecipeFeedback).mockReturnValue({
      data: [
        {
          id: 'fb-1',
          recipeId: 'recipe-1',
          eventName: 'Spring Campout',
          eventDate: '2026-04-11',
          comments: 'Big hit with the patrol',
          rating: { taste: 5, difficulty: 4, portionSize: 5 },
        },
      ],
      isLoading: false,
    } as any)

    render(
      <RecipeDetailDialog
        recipe={recipe}
        open
        onOpenChange={onOpenChange}
        onUpdateRecipe={onUpdateRecipe}
      />
    )

    expect(screen.getByText('Past Feedback')).toBeInTheDocument()
    expect(screen.getByText('Spring Campout')).toBeInTheDocument()
    expect(screen.getByText('Big hit with the patrol')).toBeInTheDocument()
    expect(screen.getByText('1 review')).toBeInTheDocument()
  })

  it('hides print button when print recipes feature flag is off', () => {
    __setFeatureFlagsForTests({ 'enable-print-recipes': false })

    render(
      <RecipeDetailDialog
        recipe={recipe}
        open
        onOpenChange={onOpenChange}
        onUpdateRecipe={onUpdateRecipe}
      />
    )

    expect(screen.queryByRole('button', { name: 'Print' })).not.toBeInTheDocument()
    expect(document.body.querySelector('.print-only')).toBeNull()
  })
})
