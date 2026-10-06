"use client";

import { ReactNode, useEffect, useMemo, useState } from "react";

import DashboardShell from "@/components/Dashboard/DashboardShell";
import { useAuthStore } from "@/store/authStore";
import {
  AppSettings,
  DEFAULT_SETTINGS,
  loadSettings,
  saveSettings,
} from "@/lib/settings";

type TabId = "general" | "notifications" | "ai" | "privacy";

interface SettingsUser {
  id?: number | string;
  role?: string;
}

interface Notice {
  tone: "success" | "info" | "error";
  text: string;
}

function LineIcon({
  children,
  className = "h-4 w-4",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

const NAV_ITEMS: {
  id: TabId;
  label: string;
  description: string;
  icon: ReactNode;
}[] = [
  {
    id: "general",
    label: "General",
    description: "Region and display",
    icon: (
      <>
        <path d="M4 6h8M16 6h4" />
        <circle cx="14" cy="6" r="2" />
        <path d="M4 12h2M10 12h10" />
        <circle cx="8" cy="12" r="2" />
        <path d="M4 18h10M18 18h2" />
        <circle cx="16" cy="18" r="2" />
      </>
    ),
  },
  {
    id: "notifications",
    label: "Notifications",
    description: "Alerts and reminders",
    icon: (
      <>
        <path d="M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8" />
        <path d="M10 21a2 2 0 0 0 4 0" />
      </>
    ),
  },
  {
    id: "ai",
    label: "AI and documents",
    description: "Extraction and chat",
    icon: (
      <>
        <path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z" />
        <path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z" />
      </>
    ),
  },
  {
    id: "privacy",
    label: "Privacy and data",
    description: "Your data on this device",
    icon: <path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z" />,
  },
];

function previewDate(date: Date, format: AppSettings["dateFormat"]) {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  const monthName = date.toLocaleDateString("en-GB", { month: "short" });

  switch (format) {
    case "dd/mm/yyyy":
      return `${day}/${month}/${year}`;
    case "mm/dd/yyyy":
      return `${month}/${day}/${year}`;
    default:
      return `${day} ${monthName} ${year}`;
  }
}

/* ------------------------------ UI primitives ----------------------------- */

function Card({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-6 py-4">
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>

        {description && (
          <p className="mt-0.5 text-xs text-slate-400">{description}</p>
        )}
      </div>

      <div className="divide-y divide-slate-100 px-6">{children}</div>
    </section>
  );
}

function SettingRow({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-900">{title}</p>

        {description && (
          <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
            {description}
          </p>
        )}
      </div>

      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  label,
  disabled = false,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
        checked ? "bg-blue-600" : "bg-slate-300"
      }`}
    >
      <span
        className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

function SelectField({
  value,
  onChange,
  options,
  label,
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  label: string;
  disabled?: boolean;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      aria-label={label}
      disabled={disabled}
      className="w-full min-w-50 rounded-lg border border-slate-300 bg-white py-2 pl-3 pr-8 text-sm text-slate-700 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 sm:w-auto"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
  label: string;
}) {
  return (
    <div
      className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5"
      role="group"
      aria-label={label}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          aria-pressed={value === option.value}
          className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            value === option.value
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function ConfirmButton({
  label,
  confirmLabel,
  onConfirm,
  danger = false,
}: {
  label: string;
  confirmLabel: string;
  onConfirm: () => void;
  danger?: boolean;
}) {
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!armed) return;

    const timer = setTimeout(() => setArmed(false), 4000);

    return () => clearTimeout(timer);
  }, [armed]);

  return (
    <button
      type="button"
      onClick={() => {
        if (armed) {
          setArmed(false);
          onConfirm();
        } else {
          setArmed(true);
        }
      }}
      className={`rounded-lg border px-3.5 py-2 text-sm font-medium transition-colors ${
        armed
          ? "border-red-300 bg-red-50 text-red-700 hover:bg-red-100"
          : danger
            ? "border-red-200 bg-white text-red-600 hover:bg-red-50"
            : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
      }`}
    >
      {armed ? confirmLabel : label}
    </button>
  );
}

/* ---------------------------------- Page ---------------------------------- */

export default function SettingsPage() {
  const user = useAuthStore(
    (state) => state.user,
  ) as unknown as SettingsUser | null;

  const userKey = String(user?.id ?? "me");
  const role = (user?.role ?? "employee").toLowerCase();
  const isReviewer = role === "manager" || role === "admin";

  const [activeTab, setActiveTab] = useState<TabId>("general");
  const [ready, setReady] = useState(false);
  const [saved, setSaved] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [draft, setDraft] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [notice, setNotice] = useState<Notice | null>(null);

  const [zones, setZones] = useState<string[]>([]);
  const [detectedZone, setDetectedZone] = useState("");
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const loaded = loadSettings(userKey);

    setSaved(loaded);
    setDraft(loaded);
    setReady(true);
  }, [userKey]);

  useEffect(() => {
    const intl = Intl as unknown as {
      supportedValuesOf?: (key: string) => string[];
    };

    try {
      setZones(intl.supportedValuesOf?.("timeZone") ?? []);
    } catch {
      setZones([]);
    }

    setDetectedZone(Intl.DateTimeFormat().resolvedOptions().timeZone);
    setNow(new Date());
  }, []);

  useEffect(() => {
    if (!notice) return;

    const timer = setTimeout(() => setNotice(null), 4000);

    return () => clearTimeout(timer);
  }, [notice]);

  const dirty = useMemo(
    () => JSON.stringify(saved) !== JSON.stringify(draft),
    [saved, draft],
  );

  useEffect(() => {
    if (!dirty) return;

    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handler);

    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const zoneOptions = useMemo(() => {
    const list = zones.map((zone) => ({
      value: zone,
      label: zone.replace(/_/g, " "),
    }));

    if (draft.timeZone !== "auto" && !zones.includes(draft.timeZone)) {
      list.unshift({
        value: draft.timeZone,
        label: draft.timeZone.replace(/_/g, " "),
      });
    }

    return [
      {
        value: "auto",
        label: `Automatic (${detectedZone || "browser time zone"})`,
      },
      ...list,
    ];
  }, [zones, detectedZone, draft.timeZone]);

  function set<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  const handleSave = () => {
    if (saveSettings(userKey, draft)) {
      setSaved(draft);
      setNotice({ tone: "success", text: "Settings saved on this device." });
    } else {
      setNotice({
        tone: "error",
        text: "Could not save. Browser storage may be blocked.",
      });
    }
  };

  const handleDiscard = () => {
    setDraft(saved);
    setNotice({ tone: "info", text: "Changes discarded." });
  };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(saved, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "my-settings.json";
    link.click();

    URL.revokeObjectURL(url);
  };

  const handleClearImages = () => {
    try {
      localStorage.removeItem(`profile-avatar:${userKey}`);
      localStorage.removeItem(`profile-cover:${userKey}`);
      setNotice({
        tone: "success",
        text: "Profile photo and cover removed from this device.",
      });
    } catch {
      setNotice({ tone: "error", text: "Could not clear local data." });
    }
  };

  const handleReset = () => {
    setDraft({ ...DEFAULT_SETTINGS });
    setNotice({
      tone: "info",
      text: "Defaults restored. Save changes to apply them.",
    });
  };

  const noChannel = !draft.channelEmail && !draft.channelInApp;

  if (!ready) {
    return (
      <DashboardShell>
        <div className="mx-auto max-w-6xl animate-pulse space-y-6">
          <div className="h-8 w-40 rounded bg-slate-200" />

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
            <div className="h-72 rounded-xl border border-slate-200 bg-white" />
            <div className="h-96 rounded-xl border border-slate-200 bg-white" />
          </div>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Settings</h1>

            <p className="mt-1 text-sm text-slate-500">
              Manage your preferences for notifications, the AI assistant and
              how information is shown.
            </p>
          </div>

          <div className="flex items-center gap-3" aria-live="polite">
            {notice && (
              <span
                className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                  notice.tone === "success"
                    ? "bg-emerald-50 text-emerald-700"
                    : notice.tone === "error"
                      ? "bg-red-50 text-red-700"
                      : "bg-slate-100 text-slate-600"
                }`}
              >
                {notice.text}
              </span>
            )}

            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${
                dirty
                  ? "border-amber-200 bg-amber-50 text-amber-700"
                  : "border-emerald-200 bg-emerald-50 text-emerald-700"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  dirty ? "bg-amber-500" : "bg-emerald-500"
                }`}
              />
              {dirty ? "Unsaved changes" : "All changes saved"}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
          {/* Section menu */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
              <nav
                aria-label="Settings sections"
                className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible"
              >
                {NAV_ITEMS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveTab(item.id)}
                    aria-current={activeTab === item.id ? "page" : undefined}
                    className={`flex shrink-0 items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors lg:w-full ${
                      activeTab === item.id
                        ? "bg-blue-50 text-blue-700"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <LineIcon className="h-4 w-4 shrink-0">
                      {item.icon}
                    </LineIcon>

                    <span className="min-w-0">
                      <span className="block text-sm font-medium">
                        {item.label}
                      </span>

                      <span
                        className={`hidden text-xs lg:block ${
                          activeTab === item.id
                            ? "text-blue-600/70"
                            : "text-slate-400"
                        }`}
                      >
                        {item.description}
                      </span>
                    </span>
                  </button>
                ))}
              </nav>
            </div>

            <p className="mt-3 hidden px-1 text-xs leading-relaxed text-slate-400 lg:block">
              Preferences are saved in this browser for your account.
            </p>
          </aside>

          {/* Content */}
          <div className="min-w-0 space-y-6">
            {activeTab === "general" && (
              <>
                <Card
                  title="Region"
                  description="How dates and times are shown to you."
                >
                  <SettingRow
                    title="Time zone"
                    description="Used for timestamps in audit logs and due dates."
                  >
                    <SelectField
                      label="Time zone"
                      value={draft.timeZone}
                      onChange={(value) => set("timeZone", value)}
                      options={zoneOptions}
                    />
                  </SettingRow>

                  <SettingRow
                    title="Date format"
                    description={
                      now
                        ? `Today would be shown as ${previewDate(now, draft.dateFormat)}.`
                        : undefined
                    }
                  >
                    <SelectField
                      label="Date format"
                      value={draft.dateFormat}
                      onChange={(value) =>
                        set("dateFormat", value as AppSettings["dateFormat"])
                      }
                      options={[
                        { value: "dd-mmm-yyyy", label: "06 Oct 2026" },
                        { value: "dd/mm/yyyy", label: "06/10/2026" },
                        { value: "mm/dd/yyyy", label: "10/06/2026" },
                      ]}
                    />
                  </SettingRow>
                </Card>

                <Card
                  title="Display"
                  description="Defaults for lists, tables and charts."
                >
                  <SettingRow
                    title="Table density"
                    description="Compact fits more rows on the screen."
                  >
                    <Segmented
                      label="Table density"
                      value={draft.density}
                      onChange={(value) => set("density", value)}
                      options={[
                        { value: "comfortable", label: "Comfortable" },
                        { value: "compact", label: "Compact" },
                      ]}
                    />
                  </SettingRow>

                  <SettingRow
                    title="Rows per page"
                    description="Default page size for tables such as audit logs."
                  >
                    <SelectField
                      label="Rows per page"
                      value={String(draft.rowsPerPage)}
                      onChange={(value) =>
                        set(
                          "rowsPerPage",
                          Number(value) as AppSettings["rowsPerPage"],
                        )
                      }
                      options={[
                        { value: "10", label: "10 rows" },
                        { value: "25", label: "25 rows" },
                        { value: "50", label: "50 rows" },
                      ]}
                    />
                  </SettingRow>

                  <SettingRow
                    title="Default dashboard range"
                    description="The time range the dashboard charts open with."
                  >
                    <Segmented
                      label="Default dashboard range"
                      value={draft.dashboardRange}
                      onChange={(value) => set("dashboardRange", value)}
                      options={[
                        { value: "7d", label: "7 days" },
                        { value: "30d", label: "30 days" },
                        { value: "90d", label: "90 days" },
                      ]}
                    />
                  </SettingRow>
                </Card>
              </>
            )}

            {activeTab === "notifications" && (
              <>
                <Card
                  title="Delivery channels"
                  description="Where you want to receive notifications."
                >
                  <SettingRow
                    title="Email"
                    description="Sent to the email address on your account."
                  >
                    <Toggle
                      label="Email notifications"
                      checked={draft.channelEmail}
                      onChange={(value) => set("channelEmail", value)}
                    />
                  </SettingRow>

                  <SettingRow
                    title="In-app"
                    description="Shown in the bell menu at the top of the page."
                  >
                    <Toggle
                      label="In-app notifications"
                      checked={draft.channelInApp}
                      onChange={(value) => set("channelInApp", value)}
                    />
                  </SettingRow>
                </Card>

                <Card
                  title="What to notify me about"
                  description={
                    noChannel
                      ? "Turn on at least one channel above to receive these."
                      : "Choose which events create a notification."
                  }
                >
                  <SettingRow
                    title="Decisions on my documents"
                    description="When a document you submitted is approved or rejected."
                  >
                    <Toggle
                      label="Decisions on my documents"
                      checked={draft.notifyDecisions}
                      disabled={noChannel}
                      onChange={(value) => set("notifyDecisions", value)}
                    />
                  </SettingRow>

                  {isReviewer && (
                    <SettingRow
                      title="New documents awaiting my review"
                      description="When a document is submitted for you to review."
                    >
                      <Toggle
                        label="New documents awaiting my review"
                        checked={draft.notifyReviewRequests}
                        disabled={noChannel}
                        onChange={(value) =>
                          set("notifyReviewRequests", value)
                        }
                      />
                    </SettingRow>
                  )}

                  <SettingRow
                    title="Due date reminders"
                    description="A reminder before a document's approval deadline."
                  >
                    <Toggle
                      label="Due date reminders"
                      checked={draft.notifyReminders}
                      disabled={noChannel}
                      onChange={(value) => set("notifyReminders", value)}
                    />
                  </SettingRow>

                  <SettingRow
                    title="Remind me"
                    description="How long before the deadline the reminder is sent."
                  >
                    <SelectField
                      label="Reminder lead time"
                      value={String(draft.reminderLeadDays)}
                      disabled={noChannel || !draft.notifyReminders}
                      onChange={(value) =>
                        set(
                          "reminderLeadDays",
                          Number(value) as AppSettings["reminderLeadDays"],
                        )
                      }
                      options={[
                        { value: "1", label: "1 day before" },
                        { value: "2", label: "2 days before" },
                        { value: "3", label: "3 days before" },
                      ]}
                    />
                  </SettingRow>

                  <SettingRow
                    title="Weekly summary"
                    description="A weekly email with your document activity."
                  >
                    <Toggle
                      label="Weekly summary"
                      checked={draft.notifyDigest}
                      disabled={!draft.channelEmail}
                      onChange={(value) => set("notifyDigest", value)}
                    />
                  </SettingRow>
                </Card>
              </>
            )}

            {activeTab === "ai" && (
              <>
                <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                  <LineIcon className="mt-0.5 h-4 w-4 shrink-0">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 8h.01M11 12h1v4h1" />
                  </LineIcon>

                  <p>
                    The AI assistant extracts information and answers
                    questions. It never approves or rejects a document. That
                    decision always stays with a human reviewer.
                  </p>
                </div>

                <Card
                  title="Document processing"
                  description="What happens when you upload a document."
                >
                  <SettingRow
                    title="Extract fields automatically"
                    description="Read amounts, dates and parties as soon as a document is uploaded."
                  >
                    <Toggle
                      label="Extract fields automatically"
                      checked={draft.autoExtract}
                      onChange={(value) => set("autoExtract", value)}
                    />
                  </SettingRow>

                  <SettingRow
                    title={
                      isReviewer
                        ? "Show AI confidence on the review page"
                        : "Show AI confidence on my documents"
                    }
                    description="Displays how sure the AI is about each extracted value."
                  >
                    <Toggle
                      label="Show AI confidence"
                      checked={draft.showAiConfidence}
                      onChange={(value) => set("showAiConfidence", value)}
                    />
                  </SettingRow>
                </Card>

                <Card
                  title="Document chat"
                  description="How the assistant answers questions about a document."
                >
                  <SettingRow
                    title="Show source pages"
                    description="Display the page numbers an answer is based on."
                  >
                    <Toggle
                      label="Show source pages"
                      checked={draft.showChatSources}
                      onChange={(value) => set("showChatSources", value)}
                    />
                  </SettingRow>

                  <SettingRow
                    title="Answer style"
                    description="Concise gives short direct answers. Detailed adds more context."
                  >
                    <Segmented
                      label="Answer style"
                      value={draft.answerStyle}
                      onChange={(value) => set("answerStyle", value)}
                      options={[
                        { value: "concise", label: "Concise" },
                        { value: "detailed", label: "Detailed" },
                      ]}
                    />
                  </SettingRow>
                </Card>
              </>
            )}

            {activeTab === "privacy" && (
              <>
                <Card
                  title="Your data on this device"
                  description="Preferences and images are stored in this browser only."
                >
                  <SettingRow
                    title="Export my settings"
                    description="Download your saved preferences as a JSON file."
                  >
                    <button
                      type="button"
                      onClick={handleExport}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                    >
                      <LineIcon>
                        <path d="M12 3v12" />
                        <path d="m7 10 5 5 5-5" />
                        <path d="M5 21h14" />
                      </LineIcon>
                      Export
                    </button>
                  </SettingRow>

                  <SettingRow
                    title="Remove profile photo and cover"
                    description="Deletes the images you uploaded on the profile page from this device."
                  >
                    <ConfirmButton
                      label="Remove images"
                      confirmLabel="Click again to confirm"
                      onConfirm={handleClearImages}
                    />
                  </SettingRow>
                </Card>

                <Card
                  title="Reset"
                  description="Return every setting to its default value."
                >
                  <SettingRow
                    title="Reset all settings"
                    description="Restores the defaults. You still need to save to apply them."
                  >
                    <ConfirmButton
                      label="Reset to defaults"
                      confirmLabel="Click again to confirm"
                      onConfirm={handleReset}
                      danger
                    />
                  </SettingRow>
                </Card>
              </>
            )}

            {/* Save bar */}
            {dirty && (
              <div className="sticky bottom-4 z-20 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-5 py-3 shadow-lg">
                <p className="text-sm text-slate-600">
                  <span className="font-medium text-slate-900">
                    You have unsaved changes.
                  </span>{" "}
                  Save them to keep your preferences.
                </p>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDiscard}
                    className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                  >
                    Discard
                  </button>

                  <button
                    type="button"
                    onClick={handleSave}
                    className="rounded-lg bg-blue-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700"
                  >
                    Save changes
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}