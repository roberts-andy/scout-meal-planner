import { useEffect, useState } from 'react'
import { Event, Recipe } from '@/lib/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { generateShoppingList, categorizeIngredients, formatQuantity } from '@/lib/helpers'
import { ShoppingCart } from '@phosphor-icons/react'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'

interface EventShoppingListProps {
  event: Event
  recipes: Recipe[]
  onUpdateEvent: (event: Event) => void
}

export function EventShoppingList({ event, recipes, onUpdateEvent }: EventShoppingListProps) {
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set(event.purchasedItems || []))

  useEffect(() => {
    setCheckedItems(new Set(event.purchasedItems || []))
  }, [event.id])

  const shoppingList = generateShoppingList(event, recipes, checkedItems)
  const categorized = categorizeIngredients(shoppingList)

  const toggleItem = (key: string) => {
    const newChecked = new Set(checkedItems)
    if (newChecked.has(key)) {
      newChecked.delete(key)
    } else {
      newChecked.add(key)
    }
    setCheckedItems(newChecked)
    onUpdateEvent({
      ...event,
      purchasedItems: Array.from(newChecked),
    })
  }

  if (shoppingList.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6">
        <ShoppingCart size={64} weight="duotone" className="text-muted-foreground mb-4" />
        <h2 className="text-2xl font-semibold mb-2">No shopping list yet</h2>
        <p className="text-muted-foreground text-center max-w-md">
          Add meals with recipes to generate a shopping list automatically
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-2">Shopping List</h2>
        <p className="text-muted-foreground">
          {checkedItems.size} of {shoppingList.length} items checked
        </p>
      </div>

      <Accordion type="multiple" defaultValue={Array.from(categorized.keys())} className="w-full">
        {Array.from(categorized.entries()).map(([category, items]) => (
          <AccordionItem key={category} value={category}>
            <AccordionTrigger className="capitalize">
              {category} ({items.length})
            </AccordionTrigger>
            <AccordionContent>
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    {items.map((item) => {
                      const key = `${item.ingredient.name.toLowerCase()}-${item.ingredient.unit}`
                      const isChecked = checkedItems.has(key)
                      
                      return (
                        <div
                          key={key}
                          className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <Checkbox
                            id={key}
                            checked={isChecked}
                            onCheckedChange={() => toggleItem(key)}
                            className="mt-0.5"
                          />
                          <div className="flex-1 space-y-1">
                            <label
                              htmlFor={key}
                              className={`text-sm font-medium leading-none cursor-pointer ${
                                isChecked ? 'line-through text-muted-foreground' : ''
                              }`}
                            >
                              {item.ingredient.name}
                            </label>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <span>
                                {formatQuantity(item.totalQuantity, item.ingredient.unit)}{' '}
                                {item.ingredient.unit !== 'to-taste' && item.ingredient.unit}
                              </span>
                              <span>•</span>
                              <span className="text-xs">{item.recipes.join(', ')}</span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  )
}
