import apiClient from "@/lib/api";
import { API_ROUTES } from "@upcat/shared";

async function unwrap<T>(promise: Promise<{ data: { data: T; } }>): Promise<T> {
    const { data } = await promise;
    return data.data;
}

export interface PaymentConfigResponse {
    activePaymentType: "free" | "manual" | "pangmeryenda";
    plans: Array<{
        id: string;
        name: string;
        duration: number;
        isLifetime: boolean;
        price: number;
        currency: "PHP";
        originalPrice: number | null;
        description: string;
        isPopular: boolean;
        isActive: boolean;
        features: string[];
        order: number;
    }>;
    userSubscription: {
        tier: "free" | "premium";
        endDate: string | null;
        daysRemaining: number | null;
        isLifetime: boolean;
        planName?: string | null;
        source?: string | null;
    };
    manual: {
        processingTimeMessage: string;
        instructionsHeader: string;
        instructionsBody: string;
        channels: Array<{
            id: string;
            name: string;
            type: "ewallet" | "bank";
            icon: string;
            accountName: string;
            accountNumber: string;
            bankName: string | null;
            qrCodeImage: string | null;
            qrCodeLabel: string | null;
            additionalNotes: string | null;
        }>;
    } | null;
    pangmeryenda: { available: boolean } | null;
    promoCodeEnabled: boolean;
}

export interface FeatureAccessResponse {
    tier: "free" | "premium";
    features: Record<string, {
        accessible: boolean;
        limit: number | null;
        used: number;
        remaining: number | null;
        period: string | null;
        upgradeRequired: boolean;
    }>;
}

export const paymentApi = {
    config: () => unwrap<PaymentConfigResponse>(apiClient.get(API_ROUTES.PAYMENT.CONFIG)),

    submitManual: async (formData: FormData) => {
        const { data } = await apiClient.post<{ data: { submissionNumber: string; status: string; message: string } }>({
            API_ROUTES.PAYMENT.MANUAL_SUBMIT,
            formData,
            headers: { "Content-Type": "multipart/form-data" },
        });
        return data.data;
    },

    mySubmissions: (page = 1, limit = 20) => unwrap<{
        items: Array<{
            submissionNumber: string;
            planName: string;
            amount: number;
            channel: string;
            status: string;
            createdAt: string;
            reviewedAt: string | null;
        }>;
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>(apiClient.get(`${API_ROUTES.PAYMENT.MANUAL_SUBMISSIONS}?page=${page}&limit=${limit}`)),

    submissionDetail: (submissionNumber: string) => unwrap<Record<string, unknown>>(apiClient.get(API_ROUTES.PAYMENT.MANUAL_SUBMISSION(submissionNumber))),
    cancelSubmission: (submissionNumber: string) => unwrap<{ cancelled: true }>(
apiClient.post(API_ROUTES.PAYMENT.MANUAL_CANCEL(submissionNumber)),
),

initiatePangMeryenda: (planId: string, promoCode?: string) =>
  unwrap<({ transactionId: string; paymentUrl: string; redirectTo: string })>(
    apiClient.post(API_ROUTES.PAYMENT.PANGMERYENDA_INITIATE, { planId, promoCode }),
  ),

pangMeryendaStatus: (transactionId: string) =>
  unwrap<({ transactionId: string; status: string; amount: number; completedAt: string | null })>(
    apiClient.get(API_ROUTES.PAYMENT.PANGMERYENDA_STATUS(transactionId)),
  ),

validatePromoCode: (code: string) =>
  unwrap<({ valid: boolean; type?: string; grant?: Record<string, unknown>; reason?: string })>(
    apiClient.post(API_ROUTES.PAYMENT.PROMO_VALIDATE, { code }),
  ),
redeemPromoCode: (code: string) =>
  unwrap<({ redeemed: boolean; result: { tier: string; endDate: string | null } | null; reason?: string })>(
    apiClient.post(API_ROUTES.PAYMENT.PROMO_REDEEM, { code }),
  ),
featureAccess: () => unwrap<FeatureAccessResponse>(apiClient.get(API_ROUTES.FEATURES.ACCESS)),
featureCheck: (featureId: string) =>
  unwrap<({ allowed: boolean; reason?: string; upgradeUrl?: string })>(
    apiClient.post(API_ROUTES.FEATURES.CHECK, { featureId }),
  ),
trackFeature: (featureId: string) =>
  unwrap<({ tracked: boolean; count: number; period: string })>(
    apiClient.post(API_ROUTES.FEATURES.TRACK_USAGE, { featureId }),
  ),
subscriptionStatus: () => 
  unwrap<{
    tier: "free" | "premium";
    isPremium: boolean;
    isLifetime: boolean;
    startDate: string | null;
    endDate: string | null;
    daysRemaining: number | null;
    planName: string | null;
    source: string | null;
    isExpiringSoon: boolean;
    renewalOptions: Array<Record<string, unknown>>;
    history: Array<Record<string, unknown>>;
  }>(apiClient.get(API_ROUTES.SUBSCRIPTION.STATUS)),
cancelSubscription: () => 
  unwrap<{ cancelled: true; premiumEndsAt: string | null }>(
    apiClient.post(API_ROUTES.SUBSCRIPTION.CANCEL),
  );
};