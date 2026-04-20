import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Event, Recipe } from '@/lib/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { generateShoppingList, categorizeIngredients, formatQuantity } from '@/lib/helpers'
import { ShoppingCart } from '@phosphor-icons/react'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { eventsApi } from '@/lib/api'
import { isFeatureEnabled } from '@/lib/featureFlags'
import { toast } from 'sonner'

interface EventShoppingListProps {
  event: Event
  recipes: Recipe[]
}

export function EventShoppingList({ event, recipes }: EventShoppingListProps) {
  const queryClient = useQueryClient()
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set(event.purchasedItems ?? []))
  const [recipientEmail, setRecipientEmail] = useState('')
  const [isSendingEmail, setIsSendingEmail] = useState(false)
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false)
  const emailShoppingListEnabled = isFeatureEnabled('enable-email-shopping-list')

  useEffect(() => {
    setCheckedItems(new Set(event.purchasedItems ?? []))
  }, [event.purchasedItems])

  const shoppingList = generateShoppingList(event, recipes, checkedItems)
  const categorized = categorizeIngredients(shoppingList)
  const totalEstimatedCost = shoppingList.reduce((sum, item) => sum + (item.ingredient.estimatedPrice ?? 0), 0)

  const formatPrice = (price?: number) => {
    if (price === undefined) return '—'
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(price)
  }

  const togglePurchasedMutation = useMutation({
    mutationFn: ({ item, purchased }: { item: string; purchased: boolean }) =>
      eventsApi.togglePurchasedItem(event.id, item, purchased),
    onMutate: ({ item, purchased }) => {
      setCheckedItems((prev) => {
        const next = new Set(prev)
        if (purchased) {
          next.add(item)
        } else {
          next.delete(item)
        }
        return next
      })
    },
    onError: (_error, { item, purchased }) => {
      setCheckedItems((prev) => {
        const next = new Set(prev)
        if (purchased) {
          next.delete(item)
        } else {
          next.add(item)
        }
        return next
      })
      toast.error('Failed to save shopping list checkmark')
    },
    onSuccess: (updatedEvent) => {
      setCheckedItems(new Set(updatedEvent.purchasedItems ?? []))
      queryClient.setQueryData<Event[]>(['events'], (old) =>
        (old || []).map((existing) => (existing.id === updatedEvent.id ? updatedEvent : existing))
      )
      queryClient.setQueryData<Event>(['events', updatedEvent.id], updatedEvent)
    },
  })

  const handleSendEmail = async () => {
    const email = recipientEmail.trim()
    if (!email) {
      toast.error('Recipient email is required')
      return
    }

    setIsSendingEmail(true)
    try {
      await eventsApi.emailShoppingList(event.id, {
        recipientEmail: email,
        items: shoppingList.map((item) => ({
          name: item.ingredient.name,
          quantity: item.totalQuantity,
          unit: item.ingredient.unit,
        })),
      })
      toast.success('Shopping list emailed')
      setIsEmailDialogOpen(false)
      setRecipientEmail('')
    } catch (err) {
      toast.error('Failed to email shopping list', {
        description: err instanceof Error ? err.message : 'Unknown error',
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
      <div>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold mb-2">Shopping List</h2>
            <p className="text-muted-foreground">
              {checkedItems.size} of {shoppingList.length} items checked
            </p>
          </div>
          {emailShoppingListEnabled && (
            <Dialog open={isEmailDialogOpen} onOpenChange={setIsEmailDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">Email List</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Email shopping list</DialogTitle>
                  <DialogDescription>
                    Send this shopping list to anyone by entering their email address.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-2">
                  <Label htmlFor="shopping-list-recipient-email">Recipient email</Label>
                  <Input
                    id="shopping-list-recipient-email"
                    type="email"
                    placeholder="name@example.com"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                  />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsEmailDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleSendEmail} disabled={isSendingEmail}>
                    {isSendingEmail ? 'Sending…' : 'Send Email'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
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
                    <div className="grid grid-cols-[1fr_auto_auto] items-center px-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      <span>Item</span>
                      <span className="text-right">Quantity</span>
                      <span className="w-20 text-right">Price</span>
                    </div>
                    {items.map((item) => {
                      const key = `${item.ingredient.name.toLowerCase()}-${item.ingredient.unit}`
                      const isChecked = checkedItems.has(key)
                      
                      return (
                        <div
                          key={key}
                          className="grid grid-cols-[auto_1fr_auto_auto] items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                        >
                            <Checkbox
                              id={key}
                              checked={isChecked}
                              onCheckedChange={() =>
                                togglePurchasedMutation.mutate({
                                  item: key,
                                  purchased: !isChecked,
                                })
                              }
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
                            <div className="text-xs text-muted-foreground">{item.recipes.join(', ')}</div>
                          </div>
                          <span className="text-sm text-muted-foreground text-right">
                            {formatQuantity(item.totalQuantity, item.ingredient.unit)}{' '}
                            {item.ingredient.unit !== 'to-taste' && item.ingredient.unit}
                          </span>
                          <span className="w-20 text-sm text-right">{formatPrice(item.ingredient.estimatedPrice)}</span>
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

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between text-sm font-medium">
            <span>Total Estimated Cost</span>
            <span>{formatPrice(totalEstimatedCost)}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
