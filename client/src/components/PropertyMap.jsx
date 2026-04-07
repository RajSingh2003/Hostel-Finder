import { useEffect, useRef } from 'react'

// Lightweight map component — works with or without Google Maps API key
// If no key provided, falls back to OpenStreetMap iframe embed

export default function PropertyMap({ lat, lng, title, city }) {
  const mapRef = useRef(null)
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_KEY

  // If coordinates not provided, try to use city name
  const hasCoords = lat && lng

  useEffect(() => {
    if (!apiKey || !hasCoords) return
    if (!window.google?.maps) {
      loadGoogleMaps(apiKey).then(() => initMap())
    } else {
      initMap()
    }
  }, [lat, lng])

  function initMap() {
    if (!mapRef.current || !window.google?.maps) return
    const pos = { lat: parseFloat(lat), lng: parseFloat(lng) }
    const map = new window.google.maps.Map(mapRef.current, {
      center: pos, zoom: 15,
      styles: [
        { featureType:'all', elementType:'geometry', stylers:[{ color:'#f5f5f0' }] },
        { featureType:'road', elementType:'geometry', stylers:[{ color:'#ffffff' }] },
        { featureType:'water', elementType:'geometry', stylers:[{ color:'#c9e4f0' }] },
      ]
    })
    new window.google.maps.Marker({
      position: pos, map,
      title,
      icon: {
        path: window.google.maps.SymbolPath.CIRCLE,
        scale: 10, fillColor:'#e94560', fillOpacity:1, strokeColor:'#fff', strokeWeight:2,
      }
    })
  }

  // Use OpenStreetMap if no Google key or no coordinates
  if (!apiKey || !hasCoords) {
    const osmUrl = hasCoords
      ? `https://www.openstreetmap.org/export/embed.html?bbox=${lng-0.01},${lat-0.01},${lng+0.01},${lat+0.01}&layer=mapnik&marker=${lat},${lng}`
      : `https://www.openstreetmap.org/export/embed.html?query=${encodeURIComponent(city || 'India')}&layer=mapnik`

    return (
      <div style={{ borderRadius:'var(--radius)', overflow:'hidden', border:'1px solid var(--border)' }}>
        <div style={{ background:'var(--surface2)', padding:'0.6rem 1rem', fontSize:'0.78rem', color:'var(--text2)', display:'flex', alignItems:'center', gap:'0.4rem' }}>
          📍 <span>{title}</span>
          {!apiKey && <span style={{ marginLeft:'auto', color:'var(--text3)' }}>Add VITE_GOOGLE_MAPS_KEY for Google Maps</span>}
        </div>
        <iframe
          title="Property Location"
          src={osmUrl}
          style={{ width:'100%', height:280, border:'none' }}
          loading="lazy"
        />
      </div>
    )
  }

  return (
    <div style={{ borderRadius:'var(--radius)', overflow:'hidden', border:'1px solid var(--border)' }}>
      <div ref={mapRef} style={{ height:280, width:'100%' }} />
    </div>
  )
}

function loadGoogleMaps(apiKey) {
  return new Promise((resolve) => {
    if (window.google?.maps) return resolve()
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`
    script.onload = resolve
    document.head.appendChild(script)
  })
}
