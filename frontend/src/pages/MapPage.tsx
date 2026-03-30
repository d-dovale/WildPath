import { useRef, useEffect } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import Navbar from '../components/ui/navbar';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

// TOGGLE THIS TO ENABLE/DISABLE MAP RENDERING (for development performance)
const ENABLE_MAP = false; 

export default function MapPage() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    if (!ENABLE_MAP || !mapContainerRef.current) return;

    mapRef.current = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/outdoors-v12',
      projection: { name: 'globe' },
      center: [-98, 38],
      zoom: 3,
    });

    return () => mapRef.current?.remove();
  }, [ENABLE_MAP]);

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden">
      {/* navbar */}
      <Navbar />

      <div className="flex flex-1 overflow-hidden">
        {/* sidebar*/}
        <aside className="w-80 border-r bg-card flex flex-col shadow-sm z-10">
          <div className="p-6">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
              Map Filters
            </h2>
            {/* Person D's components go here */}
            <div className="space-y-4">
                <div className="h-10 w-full bg-muted/50 rounded-md animate-pulse" />
                <div className="h-24 w-full bg-muted/50 rounded-md animate-pulse" />
            </div>
          </div>
        </aside>

        {/* map */}
        <main className="relative flex-1 bg-slate-100">
          {ENABLE_MAP ? (
            <div ref={mapContainerRef} className="h-full w-full" />
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <h2 className="font-semibold text-xl">WildPath Explorer</h2>
              <p className="text-muted-foreground mt-2 max-w-sm">
                Map rendering is paused. Enable "ENABLE_MAP" in the code to begin tracking.
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}