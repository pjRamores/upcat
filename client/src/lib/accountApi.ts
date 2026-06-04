/**
 * Account-recovery, data-export, and account-deletion API wrappers.
 * All methods return the unwrapped `data` payload from the server envelope.
 */
import apiClient from "@/lib/api";
import {
  API_ROUTES,
  type CreateDeletionRequestPayload,
  type DataExportOptions,
  type DataRequest,
  type GenerateRecoveryCodesResponse,
  type RecoverAccountPayload,
  type RecoveryCodesStatus,
  type RecoveryVerifyPayload,
  type RecoveryVerifyResponse,
  type SecurityQuestionsPublicResponse,
  type SetSecurityQuestionsPayload,
  type VerifySecurityQuestionsPayload,
} from "@upcat/shared";

async function unwrap<T>(p: Promise<{ data: { [T] } }>): Promise<T> {
  const { data } = await p;
  return data.data;
}

export const recoveryApi = {
  generateCodes: () =>
    unwrap<GenerateRecoveryCodesResponse>(
      apiClient.post(API_ROUTES.AUTH.RECOVERY_CODES_GENERATE),
    ),
  status: () =>
    unwrap<RecoveryCodesStatus>(
      apiClient.get(API_ROUTES.AUTH.RECOVERY_CODES_STATUS),
    ),
  verifyCode: (body: RecoveryVerifyPayload) =>
    unwrap<RecoveryVerifyResponse>(
      apiClient.post(API_ROUTES.AUTH.RECOVERY_CODES_VERIFY, body),
    ),
  setSecurityQuestions: (body: SetSecurityQuestionsPayload) =>
    unwrap<{ ok: true }>({
      apiClient.post(API_ROUTES.AUTH.SECURITY_QUESTIONS_SET, body),
    }),
  lookupSecurityQuestions: (email: string) =>
    unwrap<SecurityQuestionsPublicResponse>(
      apiClient.post(API_ROUTES.AUTH.SECURITY_QUESTIONS_LOOKUP, { email }),
    ),
  verifySecurityQuestions: (body: VerifySecurityQuestionsPayload) =>
    unwrap<RecoveryVerifyResponse>(
      apiClient.post(API_ROUTES.AUTH.SECURITY_QUESTIONS_VERIFY, body),
    ),
};

/**
 * Public - completes the recovery flow with a recovery token.
 */
recoverAccount: (recoveryToken: string, body: RecoverAccountPayload) =>
  unwrap<{ ok: true }>({
    apiClient.post(API_ROUTES.AUTH.RECOVER_ACCOUNT, body, {
      headers: { Authorization: `Bearer ${recoveryToken}` },
    }),
  });

export const dataExportApi = {
  create: (options: DataExportOptions) =>
    unwrap<DataRequest>(
      apiClient.post(API_ROUTES.ACCOUNT_DATA_EXPORT, options),
    ),
  list: () =>
    unwrap<{ requests: DataRequest[] }>({
      apiClient.get(API_ROUTES.ACCOUNT_DATA_EXPORT),
    }),
  get: (id: string) =>
    unwrap<DataRequest>(
      apiClient.get(API_ROUTES.ACCOUNT_DATA_EXPORT_ID(id)),
    ),
  download: async (id: string): Promise<Blob> => {
    const res = await apiClient.get(API_ROUTES.ACCOUNT_DATA_EXPORT_DOWNLOAD(id), {
      responseType: "blob",
    });
    return res.data as Blob;
  },
};

export const deletionApi = {
  create: (body: CreateDeletionRequestPayload) =>
    unwrap<DataRequest>(
      apiClient.post(API_ROUTES.ACCOUNT_DELETION_REQUEST, body),
    ),
  current: () =>
    unwrap<{ request: DataRequest | null }>({
      apiClient.get(API_ROUTES.ACCOUNT_DELETION_REQUEST),
    }),
  confirm: (id: string, token: string) =>
    unwrap<{ confirmed: true }>({
      apiClient.post(API_ROUTES.ACCOUNT_DELETION_REQUEST_CONFIRM(id), { token }),
    }),
  cancel: (id: string) =>
    unwrap<{ cancelled: true }>({
      apiClient.post(API_ROUTES.ACCOUNT_DELETION_REQUEST_CANCEL(id)),
    }),
};
export const emailPreferencesApi = {
    get: () =>
        unwrap<{ emailPreferences: { marketing: boolean } }>(
            apiClient.get(API_ROUTES.ACCOUNT_EMAIL_PREFERENCES),
        ),
    update: (prefs: { marketing: boolean }) =>
        unwrap<{ emailPreferences: { marketing: boolean } }>(
            apiClient.patch(API_ROUTES.ACCOUNT_EMAIL_PREFERENCES, prefs),
        ),
};