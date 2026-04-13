import { Event, Recipe } from '@/lib/types'
import { Card, CardContent } from '@/components/ui/card'
import { getEquipmentList } from '@/lib/helpers'
import { Backpack } from '@phosphor-icons/react'
import { Badge } from '@/components/ui/badge'

interface EventEquipmentProps {
  event: Event
  recipes: Recipe[]
}

export function EventEquipment({ event, recipes }: EventEquipmentProps) {
  const equipmentMap = getEquipmentList(event, recipes)

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
            {Array.from(equipmentMap.entries()).map(([item, count]) => (
              <div
                key={item}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <span className="font-medium">{item}</span>
                {count > 1 && (
                  <Badge variant="secondary">×{count}</Badge>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
