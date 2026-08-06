"use client";

import { RecordSection, type SectionConfig } from "@/components/portal/record-section";
import {
  ARCHITECTURAL,
  BOOKINGS,
  COMMUNITIES_SECTION,
  LEGAL,
  MEETINGS,
  VENDORS,
  VIOLATIONS,
} from "@/lib/admin/section-configs";

/**
 * Section configs hold functions (`build`, `searchable`, column accessors), and
 * functions cannot cross the Server → Client Component boundary. So the server
 * page passes only a key plus the acting staff name, and the config is resolved
 * here, on the client.
 */

const REGISTRY = {
  architectural: ARCHITECTURAL,
  violations: VIOLATIONS,
  bookings: BOOKINGS,
  vendors: VENDORS,
  legal: LEGAL,
  communities: COMMUNITIES_SECTION,
  board: MEETINGS,
} as const;

export type SectionKey = keyof typeof REGISTRY;

/** Row and status types differ per section; the registry lookup erases them. */
type ErasedConfig = SectionConfig<{ id: string; status: string }, string>;

export function SectionByKey({
  sectionKey,
  actingStaff,
}: {
  sectionKey: SectionKey;
  actingStaff: string;
}) {
  const config = REGISTRY[sectionKey] as unknown as ErasedConfig;
  return <RecordSection config={config} actingStaff={actingStaff} />;
}
