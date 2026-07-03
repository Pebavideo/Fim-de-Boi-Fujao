/// <reference types="react" />
declare module 'react-leaflet-draw' {
  export interface EditControlProps {
    position?: string;
    onCreated?: (e: any) => void;
    onEdited?: (e: any) => void;
    onDeleted?: () => void;
    draw?: {
      polygon?: boolean;
      rectangle?: boolean;
      marker?: boolean;
      circlemarker?: boolean;
      polyline?: boolean;
      circle?: boolean;
    };
    edit?: {
      edit?: boolean;
      remove?: boolean;
    };
  }

  export const EditControl: import('react').ComponentType<EditControlProps>;
}
