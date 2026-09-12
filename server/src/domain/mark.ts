export const TRAFFIC_LIGHTS = ["green", "yellow", "red"] as const;

export type TrafficLight = (typeof TRAFFIC_LIGHTS)[number];

export function isTrafficLight(value: string): value is TrafficLight {
  return (TRAFFIC_LIGHTS as readonly string[]).includes(value);
}

export function visibleMark(
  rating: TrafficLight | null | undefined,
  recommendation: TrafficLight | null | undefined,
): TrafficLight | null {
  return rating ?? recommendation ?? null;
}
