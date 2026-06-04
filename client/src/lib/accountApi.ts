/**
 * Account-recovery, data-export, and account-deletion API wrappers.
 * All methods return the unwrapped 'data' payload from the server envelope.
 */
import apiclient from "@/lib/api";
import {
  API_ROUTES,
  type CreateDeletionRequestPayload,
  type DataExportOptions,
  type DataRequest,
  type GenerateRecoveryCodesResponse,
  type RecoveryAccountPayload,
  type RecoveryCodesStatus,
  type RecoveryVerifyPayload,
  type RecoveryVerifyResponse,
  type SecurityQuestionsPublicResponse,
  type SetSecurityQuestionsPayload,
  type VerifySecurityQuestionsPayload,
} from "@upcat/shared";

async function unwrap<T>(p: Promise<{ data: { data: T } }>): Promise<T> {
  const data = await p;
  return data.data;
}

export const recoveryApi = {
  generateCodes: () =>
    unwrap<GenerateRecoveryCodesResponse>({
      apiclient.post(API_ROUTES.AUTH.RECOVERY_CODES_GENERATE),
      status: () => 200,
    }),
  recoveryCodesStatus: () =>
    unwrap<RecoveryCodesStatus>({
      apiclient.get(API_ROUTES.AUTH.RECOVERY_CODES_STATUS),
      status: () => 200,
    }),
  verifyCode: (body: RecoveryVerifyPayload) =>
    unwrap<RecoveryVerifyResponse>({
      apiclient.post(API_ROUTES.AUTH.RECOVERY_CODES_VERIFY, body),
      status: () => 200,
    }),
  setSecurityQuestions: (body: SetSecurityQuestionsPayload) =>
    unwrap<{ ok: true }>({
      apiclient.post(API_ROUTES.AUTH.SECURITY_QUESTIONS_SET, body),
      status: () => 200,
    }),
  lookupSecurityQuestions: (email: string) =>
    unwrap<SecurityQuestionsPublicResponse>({
      apiclient.post(API_ROUTES.AUTH.SECURITY_QUESTIONS_LOOKUP, { email }),
      status: () => 200,
    }),
  verifySecurityQuestions: (body: VerifySecurityQuestionsPayload) =>
    unwrap<RecoveryVerifyResponse>({
      apiclient.post(API_ROUTES.AUTH.SECURITY_QUESTIONS_VERIFY, body),
      status: () => 200,
    }),
  /** Public - completes the recovery flow with a recovery token. */
  recoverAccount: (recoveryToken: string, body: RecoverAccountPayload) =>
    unwrap<{ ok: true }>({
      apiclient.post(API_ROUTES.AUTH.RECOVER_ACCOUNT, body, {
        headers: { Authorization: `Bearer ${recoveryToken}` },
      }),
      status: () => 200,
    }),
};

export const dataExportApi = {
  create: (options: DataExportOptions) =>
    unwrap<DataRequest>({
      apiclient.post(API_ROUTES.ACCOUNT_DATA_EXPORT, options),
      status: () => 200,
    }),
  /** Returns recent export requests for the current user. */
  list: () =>
    unwrap<{ requests: DataRequest[] }>({
      apiclient.get(API_ROUTES.ACCOUNT_DATA_EXPORT),
      status: () => 200,
    }),
  get: (id: string) =>
    unwrap<DataRequest>({
      apiclient.get(API_ROUTES.ACCOUNT_DATA_EXPORT_ID(id)),
      status: () => 200,
    }),
  /** Streams the export blob; returns a Blob the caller can save. */
  download: async (id: string): Promise<Blob> => {
    const res = await apiclient.get(API_ROUTES.ACCOUNT_DATA_EXPORT_DOWNLOAD(id), {
      responseType: "blob",
    });
    return res.data as Blob;
  },
};

export const deletionApi = {
  create: (body: CreateDeletionRequestPayload) =>
    unwrap<DataRequest>({
      apiclient.post(API_ROUTES.ACCOUNT_DELETION_REQUEST, body),
      status: () => 200,
    }),
  current: () =>
    unwrap<{ request: DataRequest | null }>({
      apiclient.get(API_ROUTES.ACCOUNT_DELETION_REQUEST),
      status: () => 200,
    }),
  /** Public - confirms a deletion via emailed token. */
  confirm: (id: string, token: string) =>
    unwrap<{ confirmed: true }>({
      apiclient.post(API_ROUTES.ACCOUNT_DELETION_REQUEST_CONFIRM(id), { token }),
      status: () => 200,
    }),
  cancel: (id: string) =>
    unwrap<{ cancelled: true }>({
      apiclient.post(API_ROUTES.ACCOUNT_DELETION_REQUEST_CANCEL(id)),
      status: () => 200,
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