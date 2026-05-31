import {beforeEach, describe, expect, it, vi} from "vitest";

const renderMock = vi.fn();
const createRootMock = vi.fn(() => ({render: renderMock}));
const captureInstallPromptMock = vi.fn();
const registerServiceWorkerMock = vi.fn();
const installGlobalErrorTrackingMock = vi.fn();
const installGlobalResilienceHooksMock = vi.fn();
const installSyncQueueHooksMock = vi.fn();

vi.mock("react-dom/client", () => ({
  createRoot: createRootMock,
}));

vi.mock("./lib/pwa", () => ({
  captureInstallPrompt: captureInstallPromptMock,
  registerServiceWorker: registerServiceWorkerMock,
}));

vi.mock("./lib/clientErrorTracking", () => ({
  installGlobalErrorTracking: installGlobalErrorTrackingMock,
}));

vi.mock("./lib/resilience", () => ({
  installGlobalResilienceHooks: installGlobalResilienceHooksMock,
}));

vi.mock("./lib/syncQueue", () => ({
  installSyncQueueHooks: installSyncQueueHooksMock,
}));

vi.mock("./router", () => ({
  router: {},
}));

vi.mock("./components/ErrorBoundary", () => ({
  default: ({children}: {children: unknown}) => children,
}));

vi.mock("./components/ToastContainer", () => ({
  default: () => null,
}));

vi.mock("./components/InstallPwaCard", () => ({
  default: () => null,
}));

describe("main·startup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    vi.stubGlobal("document", {
      getElementById: vi.fn(() => ({id: "root"})),
    });
  });

  it("installs·startup·hooks·and·renders·app", async () => {
    await import("./main");

    expect(captureInstallPromptMock).toHaveBeenCalledTimes(1);
    expect(registerServiceWorkerMock).toHaveBeenCalledTimes(1);
    expect(installGlobalErrorTrackingMock).toHaveBeenCalledTimes(1);
    expect(installGlobalResilienceHooksMock).toHaveBeenCalledTimes(1);
    expect(installSyncQueueHooksMock).toHaveBeenCalledTimes(1);
    expect(createRootMock).toHaveBeenCalledTimes(1);
    expect(renderMock).toHaveBeenCalledTimes(1);
  }, 30_000);
});