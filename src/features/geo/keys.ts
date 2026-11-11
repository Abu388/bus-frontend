export const geoKeys = {
  all: ["geo"] as const,
  searches: () => [...geoKeys.all, "search"] as const,
  search: (query: string) => [...geoKeys.searches(), query.toLowerCase()] as const,
  osmBusStops: (viewbox?: string) =>
    [...geoKeys.all, "osm-bus-stops", viewbox ?? "none"] as const,
  reverses: () => [...geoKeys.all, "reverse"] as const,
  reverse: (lat: number, lon: number) =>
    [...geoKeys.reverses(), `${lat.toFixed(4)},${lon.toFixed(4)}`] as const,
  routes: () => [...geoKeys.all, "route"] as const,
  route: (points: { lat: number; lon: number }[]) =>
    [
      ...geoKeys.routes(),
      points.map((p) => `${p.lat.toFixed(4)},${p.lon.toFixed(4)}`).join(";"),
    ] as const,
};
