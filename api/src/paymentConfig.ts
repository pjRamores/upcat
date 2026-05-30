import type {Db, ObjectId} from "mongodb";
import type {FeatureGateConfig, ManualPaymentChannel, PaymentConfig, PaymentType, PremiumPlan,} from "@upcat/shared";
import {DEFAULT_PAYMENT_CONFIG} from "@upcat/shared";

const PAYMENT_CONFIG_ID = "global";

function cloneDefaultConfig(): PaymentConfig {
  return JSON.parse(JSON.stringify(DEFAULT_PAYMENT_CONFIG)) as PaymentConfig;
}

function nowIso(): string {
  return new Date().toISOString();
}

export async function getPaymentConfig(db: Db): Promise<PaymentConfig> {
  const existing = await db
    .collection<PaymentConfig> & {_id: string}>(("payment_config")
    .findOne({_id: PAYMENT_CONFIG_ID});
    if (existing) {
      return existing as PaymentConfig;
    }
    const seeded = cloneDefaultConfig();
    seeded.updatedAt = nowIso();
    await db.collection("payment_config").insertOne(seeded as never);
    return seeded;
}

export async function savePaymentConfig(
  db: Db,
  patch: Partial<PaymentConfig>,
  updatedBy: ObjectId | null,
): Promise<PaymentConfig> {
  const current = await getPaymentConfig(db);
  const merged: PaymentConfig = {
    ...current,
    ...patch,
    ...plans: patch.plans ?? current.plans,
    ...manual: patch.manual
    ...? {
      ...current.manual,
      ...patch.manual,
      ...channels: patch.manual.channels ?? current.manual.channels,
    }
    ...: current.manual,
    ...pangmeryenda: patch.pangmeryenda
    ...? {
      ...current.pangmeryenda,
      ...patch.pangmeryenda,
      ...planMapping: patch.pangmeryenda.planMapping ?? current.pangmeryenda.planMapping,
    }
    ...: current.pangmeryenda,
    ...featureGating: patch.featureGating
    ...? {
      ...current.featureGating,
      ...patch.featureGating,
      ...features: patch.featureGating.features ?? current.featureGating.features,
    }
    ...: current.featureGating,
    ...updatedAt: nowIso(),
    ...updatedBy: updatedBy ? updatedBy.toHexString() : null,
    };
    await db
    .collection("payment_config")
    .updateOne({_id: PAYMENT_CONFIG_ID as never}, {$set: merged}, {upsert: true});
    return merged;
}

export function getPlanById(config: PaymentConfig, planId: string): PremiumPlan | null {
  return config.plans.find((p) => p.id === planId) ?? null;
}

export function getActivePlans(config: PaymentConfig): PremiumPlan[] {
  return config.plans
    .filter((p) => p.isActive)
    .sort((a, b) => a.order - b.order || a.price - b.price);
}

export function getChannelById(config: PaymentConfig, channelId: string): ManualPaymentChannel | null {
  return config.manual.channels.find((c) => c.id === channelId) ?? null;
}

export function getPublicManualChannels(config: PaymentConfig): ManualPaymentChannel[] {
  return config.manual.channels
    .filter((c) => c.enabled && !c.autoDisabled)
    .sort((a, b) => a.order - b.order)
    .map((c) => ({...c}));
}

export function getFeature(config: PaymentConfig, featureId: string): FeatureGateConfig | null {
  return config.featureGating.features.find((f) => f.id === featureId) ?? null;
}

export function maskPaymentConfigSecrets(config: PaymentConfig): PaymentConfig {
  const masked = JSON.parse(JSON.stringify(config)) as PaymentConfig;
  if (masked.pangmeryenda.apiKey) {
    masked.pangmeryenda.apiKey = "****" + masked.pangmeryenda.apiKey.slice(-4);
  }
  if (masked.pangmeryenda.apiSecretEnc) {
    masked.pangmeryenda.apiSecretEnc = "****" + masked.pangmeryenda.apiSecretEnc.slice(-4);
  }
  if (masked.pangmeryenda.webhookSecret) {
    masked.pangmeryenda.webhookSecret = "****" + masked.pangmeryenda.webhookSecret.slice(-4);
  }
  return masked;
}
export function shouldOfferPremium(config: PaymentConfig): boolean {
  return config.activePaymentType !== "free";
}

export function sanitizePublicConfig(config: PaymentConfig): {
  activePaymentType: PaymentType;
  plans: PremiumPlan[];
  manual: {
    processingTimeMessage: string;
    instructionsHeader: string;
    instructionsBody: string;
    channels: Array<
      Pick<
        ManualPaymentChannel,
        | "id"
        | "name"
        | "type"
        | "icon"
        | "accountName"
        | "accountNumber"
        | "bankName"
        | "qrCodeImage"
        | "qrCodeLabel"
        | "additionalNotes"
      >
    >;
  } | null;
  pangmeryenda: { available: boolean } | null;
} {
  const plans = getActivePlans(config);
  const manual =
    config.activePaymentType === "manual"
    ? {
      processingTimeMessage: config.manual.processingTimeMessage,
      instructionsHeader: config.manual.instructionsHeader,
      instructionsBody: config.manual.instructionsBody,
      channels: getPublicManualChannels(config).map((c) => ({
        id: c.id,
        name: c.name,
        type: c.type,
        icon: c.icon,
        accountName: c.accountName,
        accountNumber: c.accountNumber,
        bankName: c.bankName,
        qrCodeImage: c.qrCodeImage,
        qrCodeLabel: c.qrCodeLabel,
        additionalNotes: c.additionalNotes,
      })),
    } | null;
  return {
    activePaymentType: config.activePaymentType,
    plans,
    manual,
    pangmeryenda:
      config.activePaymentType === "pangmeryenda"
      ? { available: config.pangmeryenda.enabled}
      : null,
  };
}