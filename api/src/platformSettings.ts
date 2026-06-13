/**
 * Singleton accessor for the platform_settings document.
 * Stored under a fixed _id so we never have to remember which one is current.
 */
import type { Db } from "mongodb";
import { DEFAULT_PLATFORM_SETTINGS, type PlatformSettings } from "@upcat/shared";

const SETTINGS_ID = "global";

export async function getPlatformSettings(db: Db): Promise<PlatformSettings> {
  const doc = await db
    .collection<PlatformSettings & { _id: string }>("platform_settings")
    .findOne({ _id: SETTINGS_ID });

  if (!doc) {
    return structuredCloneSafe(DEFAULT_PLATFORM_SETTINGS);
  }

  // Strip _id so the shape matches PlatformSettings exactly.
  const { _id: _ignored, ...rest } = doc as PlatformSettings & { _id: string };
  void _ignored;

  return rest as PlatformSettings;
}

export async function savePlatformSettings(
  db: Db,
  patch: Partial<PlatformSettings>,
): Promise<PlatformSettings> {
  const current = await getPlatformSettings(db);

  const merged: PlatformSettings = {
    ...current,
    ...patch,
    examDefaults: {
      ...current.examDefaults,
      ...(patch.examDefaults ?? {}),
    },
    registration: {
      ...current.registration,
      ...(patch.registration ?? {}),
    },
    leaderboard: {
      ...current.leaderboard,
      ...(patch.leaderboard ?? {}),
    },
    maintenance: {
      ...current.maintenance,
      ...(patch.maintenance ?? {}),
    },
    contact: {
      ...current.contact,
      ...(patch.contact ?? {}),
    },
    scoring: {
      ...current.scoring,
      ...(patch.scoring ?? {}),
    },
    ads: patch.ads
      ? ({
          ...(current.ads ?? {}),
          ...patch.ads,
          slots: {
            ...(current.ads?.slots ?? {}),
            ...(patch.ads.slots ?? {}),
          },
          video: patch.ads.video
            ? {
                ...(current.ads?.video ?? {}),
                ...patch.ads.video,
              }
            : current.ads?.video,
        } as PlatformSettings["ads"])
      : current.ads,
  };

  await db.collection("platform_settings").updateOne(
    { _id: SETTINGS_ID as unknown as never },
    {
      $set: {
        ...merged,
        updatedAt: new Date(),
      },
    },
    { upsert: true },
  );

  return merged;
}

function structuredCloneSafe<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export const PLATFORM_SETTINGS_ID = SETTINGS_ID;
