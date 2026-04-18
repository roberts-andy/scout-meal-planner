import { createPortal } from 'react-dom'
import { Recipe } from '@/lib/types'
import { formatQuantity } from '@/lib/helpers'

interface PrintableRecipeProps {
  recipe: Recipe
  /** When provided, ingredients scale from recipe.servings → headcount */
  headcount?: number
}

/**
 * Renders a hidden print-only view of a recipe via a portal.
 * Visible only when @media print activates via window.print().
 */
export function PrintableRecipe({ recipe, headcount }: PrintableRecipeProps) {
  const scale = headcount && headcount > 0 ? headcount / recipe.servings : 1
  const servingsLabel = headcount ?? recipe.servings

  const printRoot = document.getElementById('print-root')
  if (!printRoot) return null

  return createPortal(
    <div>
      <h1>{recipe.name}</h1>
      {recipe.description && <p className="print-meta">{recipe.description}</p>}
      <p className="print-meta">
        Serves {servingsLabel} • {recipe.ingredients.length} ingredients
        {scale !== 1 && ` (scaled from ${recipe.servings})`}
      </p>

      <div className="print-section">
        <h2>Ingredients</h2>
        <ul className="print-ingredients">
          {recipe.ingredients.map((ing) => {
            const qty = ing.quantity * scale
            const formatted = formatQuantity(qty, ing.unit)
            return (
              <li key={ing.id}>
                {ing.name}
                {formatted && ` — ${formatted}`}
                {ing.unit !== 'to-taste' && ` ${ing.unit}`}
                {ing.unit === 'to-taste' && ' (to taste)'}
              </li>
            )
          })}
        </ul>
      </div>

      {recipe.variations.map((variation) => (
        <div key={variation.id} className="print-section">
          <h2>
            {variation.cookingMethod.replace('-', ' ').replace(/^\w/, (c) => c.toUpperCase())}
            {variation.cookingTime && ` — ${variation.cookingTime}`}
          </h2>

          {variation.instructions.length > 0 && (
            <div className="print-instructions">
              <ol>
                {variation.instructions.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
            </div>
          )}

          {variation.equipment.length > 0 && (
            <div style={{ marginTop: '0.5rem' }}>
              <strong style={{ fontSize: '0.85rem' }}>Equipment:</strong>
              <div className="print-equipment">
                {variation.equipment.map((item, i) => (
                  <span key={i}>{item}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>,
    printRoot
  )
}
