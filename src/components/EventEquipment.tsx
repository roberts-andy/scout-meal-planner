import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Event, Recipe } from '@/lib/types'
import { Card, CardContent } from '@/components/ui/card'
import { getEquipmentList } from '@/lib/helpers'
import { Backpack } from '@phosphor-icons/react'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { eventsApi } from '@/lib/api'
import { cn } from '@/lib/utils'

interface EventEquipmentProps {
  event: Event
  recipes: Recipe[]
}

function getEquipmentItemId(item: string): string {
  return `equipment-${item.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
}

export function EventEquipment({ event, recipes }: EventEquipmentProps) {
  const queryClient = useQueryClient()
  const equipmentMap = getEquipmentList(event, recipes)
  const [packedItems, setPackedItems] = useState<Set<string>>(new Set(event.packedItems ?? []))

  useEffect(() => {
    setPackedItems(new Set(event.packedItems ?? []))
  }, [event.packedItems])

  const togglePackedMutation = useMutation({
    mutationFn: ({ item, packed }: { item: string; packed: boolean }) =>
      eventsApi.togglePackedItem(event.id, item, packed),
    onMutate: ({ item, packed }) => {
      setPackedItems((prev) => {
        const next = new Set(prev)
        if (packed) {
          next.add(item)
        } else {
          next.delete(item)
        }
        return next
      })
    },
    onError: (_error, { item, packed }) => {
      setPackedItems((prev) => {
        const next = new Set(prev)
        if (packed) {
          next.delete(item)
        } else {
          next.add(item)
        }
        return next
      })
    },
    onSuccess: (updatedEvent) => {
      setPackedItems(new Set(updatedEvent.packedItems ?? []))
      queryClient.setQueryData<Event[]>(['events'], (old) =>
        (old || []).map((existing) => (existing.id === updatedEvent.id ? updatedEvent : existing))
      )
      queryClient.setQueryData<Event>(['events', updatedEvent.id], updatedEvent)
    },
  })

  if (equipmentMap.size === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6">
        <Backpack size={64} weight="duotone" className="text-muted-foreground mb-4" />
        <h2 className="text-2xl font-semibold mb-2">No equipment list yet</h2>
        <p className="text-muted-foreground text-center max-w-md">
          Add meals and select cooking methods to generate an equipment list
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-2">Equipment Checklist</h2>
        <p className="text-muted-foreground">
          Equipment needed for all meals
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from(equipmentMap.entries()).map(([item, count]) => {
              const itemId = getEquipmentItemId(item)
              return (
                <div key={item} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id={itemId}
                      checked={packedItems.has(item)}
                      onCheckedChange={() =>
                        togglePackedMutation.mutate({
                          item,
                          packed: !packedItems.has(item),
                        })
                      }
                    />
                    <label
                      htmlFor={itemId}
                      className={cn(
                        'font-medium cursor-pointer',
                        packedItems.has(item) && 'line-through text-muted-foreground'
                      )}
                    >
                      {item}
                    </label>
                  </div>
                  {count > 1 && (
                    <Badge variant="secondary">×{count}</Badge>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
