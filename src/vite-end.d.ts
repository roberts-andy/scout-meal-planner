/// <reference types="vite/client" />
declare const GITHUB_RUNTIME_PERMANENT_NAME: string
declare const BASE_KV_SERVICE_URL: string

declare module 'lucide-react/dist/esm/icons/*' {
  import type { LucideIcon } from 'lucide-react'

  const Icon: LucideIcon
  export default Icon
}
