import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface Props {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

export default function Map3DToggle({
  checked,
  onCheckedChange,
}: Props) {
  return (
    <div className="flex items-center justify-between">
      <Label htmlFor="map-3d-toggle" className="cursor-pointer text-sm">
        Enable 3D terrain
      </Label>
      <Switch
        id="map-3d-toggle"
        checked={checked}
        onCheckedChange={onCheckedChange}
      />
    </div>
  );
}
