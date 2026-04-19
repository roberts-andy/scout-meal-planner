import { useState } from 'react'
import { Event, Recipe } from '@/lib/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { generateShoppingList, categorizeIngredients, formatQuantity } from '@/lib/helpers'
import { EnvelopeSimple, ShoppingCart } from '@phosphor-icons/react'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { shoppingListApi } from '@/lib/api'
import { toast } from 'sonner'

interface EventShoppingListProps {
  event: Event
  recipes: Recipe[]
}

export function EventShoppingList({ event, recipes }: EventShoppingListProps) {
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set())
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false)
  const [recipientEmail, setRecipientEmail] = useState('')
  const [isSendingEmail, setIsSendingEmail] = useState(false)

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
  }

  const sendShoppingListEmail = async () => {
    if (!recipientEmail.trim()) return
    setIsSendingEmail(true)
    try {
      await shoppingListApi.email({
        recipientEmail: recipientEmail.trim(),
        eventName: event.name,
        items: shoppingList.map((item) => ({
          name: item.ingredient.name,
          quantity: item.totalQuantity,
          unit: item.ingredient.unit,
        })),
      })
      toast.success('Shopping list emailed', {
        description: `Sent to ${recipientEmail.trim()}`,
      })
      setIsEmailDialogOpen(false)
      setRecipientEmail('')
    } catch (error) {
      toast.error('Failed to email shopping list', {
        description: error instanceof Error ? error.message : 'Please try again.',
      })
    } finally {
      setIsSendingEmail(false)
    }
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
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold mb-2">Shopping List</h2>
          <p className="text-muted-foreground">
            {checkedItems.size} of {shoppingList.length} items checked
          </p>
        </div>
        <Button variant="outline" className="gap-2" onClick={() => setIsEmailDialogOpen(true)}>
          <EnvelopeSimple size={16} />
          Email List
        </Button>
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

      <Dialog open={isEmailDialogOpen} onOpenChange={setIsEmailDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Email shopping list</DialogTitle>
            <DialogDescription>
              Send this shopping list to anyone. They do not need an account.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 py-2">
            <Label htmlFor="shopping-list-recipient-email">Recipient email</Label>
            <Input
              id="shopping-list-recipient-email"
              type="email"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              placeholder="parent@example.com"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEmailDialogOpen(false)} disabled={isSendingEmail}>
              Cancel
            </Button>
            <Button onClick={sendShoppingListEmail} disabled={isSendingEmail || !recipientEmail.trim()}>
              {isSendingEmail ? 'Sending...' : 'Send Email'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
