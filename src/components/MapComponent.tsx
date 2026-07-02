import React, { useRef, useEffect } from 'react';
import { MapContainer, TileLayer, FeatureGroup } from 'react-leaflet';
import { EditControl } from 'react-leaflet-draw';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import * as L from 'leaflet';

// Fix for default icon issues with Leaflet in Webpack
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

interface MapComponentProps {
  onPolygonCreated: (polygon: L.Polygon | null) => void;
  initialPolygon?: L.Polygon | null;
}

const MapComponent: React.FC<MapComponentProps> = ({ onPolygonCreated, initialPolygon }) => {
  const featureGroupRef = useRef<L.FeatureGroup | null>(null);

  const onCreated = (e: any) => {
    const { layerType, layer } = e;
    if (layerType === 'polygon') {
      onPolygonCreated(layer as L.Polygon);
    }
  };

  const onEdited = (e: any) => {
    e.layers.eachLayer((layer: L.Layer) => {
      if (layer instanceof L.Polygon) {
        onPolygonCreated(layer);
      }
    });
  };

  const onDeleted = () => {
    onPolygonCreated(null);
  };

  useEffect(() => {
    const mapInstance = featureGroupRef.current ? ((featureGroupRef.current as any)._map as L.Map | null) : null;
    if (mapInstance && initialPolygon && featureGroupRef.current) {
      featureGroupRef.current.clearLayers();
      initialPolygon.addTo(featureGroupRef.current);
      mapInstance.fitBounds(initialPolygon.getBounds());
    }
  }, [initialPolygon]);

  return (
    <MapContainer
      center={[-15.7801, -47.9292]}
      zoom={4}
      style={{ height: '400px', width: '100%' }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
      />
      <FeatureGroup ref={featureGroupRef}>
        <EditControl
          position="topright"
          onCreated={onCreated}
          onEdited={onEdited}
          onDeleted={onDeleted}
          draw={{
            rectangle: false,
            marker: false,
            circlemarker: false,
            polyline: false,
            circle: false,
          }}
        />
      </FeatureGroup>
    </MapContainer>
  );
};

export default MapComponent;
