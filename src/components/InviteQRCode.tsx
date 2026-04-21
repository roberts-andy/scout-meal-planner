import { QRCodeSVG } from 'qrcode.react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { QrCode } from '@phosphor-icons/react'

interface InviteQRCodeProps {
  inviteLink: string
  troopName?: string
}

export function InviteQRCode({ inviteLink, troopName }: InviteQRCodeProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={!inviteLink}>
          <QrCode className="mr-2 h-4 w-4" />
          QR Code
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Join {troopName || 'Troop'}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4 py-4">
          <div className="rounded-lg bg-white p-4">
            <QRCodeSVG value={inviteLink} size={256} level="M" />
          </div>
          <p className="text-center text-sm text-muted-foreground">
            Scan this code to join the troop
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
