import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'

interface Props {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}

export default function MovementPathsToggle({ checked, onCheckedChange }: Props) {
  return (
    <div className="flex items-center justify-between">
      <Label htmlFor="movement-paths" className="text-sm cursor-pointer">
        Show movement paths
      </Label>
      <Switch
        id="movement-paths"
        checked={checked}
        onCheckedChange={onCheckedChange}
      />
    </div>
  )
}
