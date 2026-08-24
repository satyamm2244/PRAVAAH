import { WARD_DATA } from "./ward-data";

export const WARD_COORDINATES = Object.fromEntries(
  Object.entries(WARD_DATA).map(([ward, data]) => [
    ward,
    {
      lat: data.latitude,
      lng: data.longitude,
    },
  ])
);