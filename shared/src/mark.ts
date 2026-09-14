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

export type MarkKind = "empty" | "recommendation" | "rating";

export function markKind(
  rating: TrafficLight | null | undefined,
  recommendation: TrafficLight | null | undefined,
): MarkKind {
  if (rating) {
    return "rating";
  }
  if (recommendation) {
    return "recommendation";
  }
  return "empty";
}

const NEXT_RATING: Record<TrafficLight, TrafficLight> = {
  green: "yellow",
  yellow: "red",
  red: "green",
};

export function nextRating(current: TrafficLight): TrafficLight {
  return NEXT_RATING[current];
}

const MARK_SENSE: Record<TrafficLight, string> = {
  green: "fits",
  yellow: "caution",
  red: "avoid",
};

export function markAnnouncement(
  profileName: string,
  rating: TrafficLight | null | undefined,
  recommendation: TrafficLight | null | undefined,
): string {
  const kind = markKind(rating, recommendation);
  if (kind === "rating" && rating) {
    return `${profileName}, your Rating, ${MARK_SENSE[rating]}`;
  }
  if (kind === "recommendation" && recommendation) {
    return `${profileName}, Recommendation, ${MARK_SENSE[recommendation]}`;
  }
  return `${profileName}, no mark`;
}

export function resetActionName(recommendation: TrafficLight | null | undefined): string {
  return recommendation ? "Use Recommendation" : "Clear Rating";
}
