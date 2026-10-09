"use client";

import {
  ChangeEvent,
  ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";

import { useAuthStore } from "@/store/authStore";
import {
  formatRole,
  getInitials,
  getRoleBadgeClass,
} from "@/lib/userDisplay";

const DEFAULT_COVER_IMAGE_URL: string | null = null;

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const MAX_COVER_BYTES = 8 * 1024 * 1024;

type TabId = "overview" | "personal" | "security";

interface ProfileUser {
  id?: number | string;
  full_name?: string;
  email?: string;
  role?: string;
  department?: string;
  phone?: string;
  employee_id?: string;
  created_at?: string;
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
      className={`shrink-0 ${className}`}
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

const CameraPaths = (
  <>
    <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
    <circle cx="12" cy="13" r="3.5" />
  </>
);

const SignOutPaths = (
  <>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path d="m16 17 5-5-5-5" />
    <path d="M21 12H9" />
  </>
);

const TABS: { id: TabId; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "personal", label: "Personal information" },
  { id: "security", label: "Security and access" },
];

const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600";


function formatDate(value?: string) {
  if (!value) return undefined;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function describeDevice() {
  const ua = navigator.userAgent;

  const browser = ua.includes("Edg/")
    ? "Edge"
    : ua.includes("OPR/")
      ? "Opera"
      : ua.includes("Chrome/")
        ? "Chrome"
        : ua.includes("Firefox/")
          ? "Firefox"
          : ua.includes("Safari/")
            ? "Safari"
            : "Browser";

  const os = /Windows/.test(ua)
    ? "Windows"
    : /Android/.test(ua)
      ? "Android"
      : /iPhone|iPad|iPod/.test(ua)
        ? "iOS"
        : /Mac OS X/.test(ua)
          ? "macOS"
          : /Linux/.test(ua)
            ? "Linux"
            : "an unknown system";

  return `${browser} on ${os}`;
}

function processImage(
  file: File,
  targetWidth: number,
  targetHeight: number,
  quality = 0.85,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      const targetRatio = targetWidth / targetHeight;

      let cropWidth = image.width;
      let cropHeight = image.height;

      if (cropWidth / cropHeight > targetRatio) {
        cropWidth = cropHeight * targetRatio;
      } else {
        cropHeight = cropWidth / targetRatio;
      }

      const sx = (image.width - cropWidth) / 2;
      const sy = (image.height - cropHeight) / 2;

      const scale = Math.min(1, targetWidth / cropWidth);
      const outWidth = Math.round(cropWidth * scale);
      const outHeight = Math.round(cropHeight * scale);

      const canvas = document.createElement("canvas");
      canvas.width = outWidth;
      canvas.height = outHeight;

      const context = canvas.getContext("2d");

      if (!context) {
        URL.revokeObjectURL(url);
        reject(new Error("Image processing is not supported here."));
        return;
      }

      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, outWidth, outHeight);
      context.drawImage(
        image,
        sx,
        sy,
        cropWidth,
        cropHeight,
        0,
        0,
        outWidth,
        outHeight,
      );

      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("The file is not a valid image."));
    };

    image.src = url;
  });
}

async function prepareImage(
  file: File,
  maxBytes: number,
  width: number,
  height: number,
  quality?: number,
) {
  if (!file.type.startsWith("image/")) {
    throw new Error("Please choose an image file.");
  }

  if (file.size > maxBytes) {
    throw new Error(
      `The image must be smaller than ${Math.round(maxBytes / 1024 / 1024)} MB.`,
    );
  }

  return processImage(file, width, height, quality);
}

function useStoredImage(storageKey: string) {
  const [image, setImage] = useState<string | null>(null);

  useEffect(() => {
    try {
      setImage(localStorage.getItem(storageKey));
    } catch {
      setImage(null);
    }
  }, [storageKey]);

  const save = (dataUrl: string) => {
    setImage(dataUrl);

    try {
      localStorage.setItem(storageKey, dataUrl);
      return true;
    } catch {
      return false;
    }
  };

  const clear = () => {
    setImage(null);

    try {
      localStorage.removeItem(storageKey);
    } catch {
      // storage unavailable, nothing to clean up
    }
  };

  return { image, save, clear };
}


function Avatar({
  src,
  initials,
  className,
}: {
  src: string | null;
  initials: string;
  className: string;
}) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt="Profile photo" className={`${className} object-cover`} />
    );
  }

  return (
    <div
      className={`${className} flex items-center justify-center bg-slate-800 font-semibold tracking-tight text-white`}
    >
      {initials}
    </div>
  );
}

function Panel({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <header className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-3.5">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
          {description && (
            <p className="mt-0.5 text-[13px] text-slate-500">{description}</p>
          )}
        </div>
        {action}
      </header>

      {children}
    </section>
  );
}

function Row({ label, value }: { label: string; value?: ReactNode }) {
  return (
    <div className="grid gap-1 px-5 py-3 sm:grid-cols-[200px_minmax(0,1fr)] sm:gap-6">
      <dt className="text-[13px] text-slate-500">{label}</dt>
      <dd className="min-w-0 wrap-break-words text-[13px]">
        {value ? (
          <span className="font-medium text-slate-900">{value}</span>
        ) : (
          <span className="text-slate-400">Not provided</span>
        )}
      </dd>
    </div>
  );
}

function StatusPill({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
      {children}
    </span>
  );
}

function SummaryCell({ label, value }: { label: string; value?: ReactNode }) {
  return (
    <div className="min-w-0 bg-white px-5 py-4">
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="mt-1.5 truncate text-sm font-semibold text-slate-900">
        {value || <span className="font-normal text-slate-400">Not provided</span>}
      </dd>
    </div>
  );
}


export default function ProfilePage() {
  const router = useRouter();

  const user = useAuthStore(
    (state) => state.user,
  ) as unknown as ProfileUser | null;
  const logout = useAuthStore((state) => state.logout);

  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [photoMessage, setPhotoMessage] = useState("");
  const [photoError, setPhotoError] = useState("");
  const [coverMessage, setCoverMessage] = useState("");
  const [coverError, setCoverError] = useState("");
  const [device, setDevice] = useState("");
  const [timeZone, setTimeZone] = useState("");

  const photoInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const userKey = String(user?.id ?? "me");
  const avatarStore = useStoredImage(`profile-avatar:${userKey}`);
  const coverStore = useStoredImage(`profile-cover:${userKey}`);

  useEffect(() => {
    setDevice(describeDevice());
    setTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone);
  }, []);

  const profileFields = useMemo(() => {
    if (!user) return [];

    return [
      { label: "Full name", value: user.full_name },
      { label: "Email address", value: user.email },
      { label: "Employee ID", value: user.employee_id },
      { label: "Department", value: user.department },
      { label: "Phone", value: user.phone },
      { label: "Member since", value: formatDate(user.created_at) },
    ];
  }, [user]);

  const handleLogout = () => {
    logout();
    router.replace("/login");
  };

  const handlePhotoChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setPhotoMessage("");
    setPhotoError("");

    try {
      const dataUrl = await prepareImage(file, MAX_PHOTO_BYTES, 256, 256);

      setPhotoMessage(
        avatarStore.save(dataUrl)
          ? "Photo updated on this device."
          : "Photo updated for this session only.",
      );
    } catch (error) {
      setPhotoError(error instanceof Error ? error.message : "Unable to use this image.");
    }
  };

  const handleRemovePhoto = () => {
    avatarStore.clear();
    setPhotoError("");
    setPhotoMessage("Photo removed.");
  };

  const handleCoverChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setCoverMessage("");
    setCoverError("");

    try {
      const dataUrl = await prepareImage(file, MAX_COVER_BYTES, 1920, 600, 0.82);

      setCoverMessage(
        coverStore.save(dataUrl)
          ? "Cover updated on this device."
          : "Cover updated for this session only.",
      );
    } catch (error) {
      setCoverError(error instanceof Error ? error.message : "Unable to use this image.");
    }
  };

  const handleRemoveCover = () => {
    coverStore.clear();
    setCoverError("");
    setCoverMessage("Cover removed.");
  };

  const coverImage = coverStore.image ?? DEFAULT_COVER_IMAGE_URL;

  const coverStyle = coverImage
    ? {
        backgroundImage: `linear-gradient(180deg, rgba(15,23,42,0.5) 0%, rgba(15,23,42,0.1) 60%, rgba(15,23,42,0.3) 100%), url("${coverImage}")`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }
    : {
        backgroundImage: "linear-gradient(115deg, #0f172a 0%, #1e3a8a 60%, #2563eb 100%)",
      };

  /* ---------------------------- Loading state ----------------------------- */

  if (!user) {
    return (
      <div className="min-h-full bg-[#f5f6f8] scheme:light">
        <div role="status" aria-busy="true" aria-label="Loading profile" className="animate-pulse motion-reduce:animate-none">
          <div className="h-36 w-full bg-slate-200 sm:h-44" />

          <div className="mx-auto -mt-12 max-w-6xl space-y-6 px-4 sm:px-6">
            <div className="h-36 rounded-lg border border-slate-200 bg-white" />
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="h-80 rounded-lg border border-slate-200 bg-white" />
              <div className="h-80 rounded-lg border border-slate-200 bg-white" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ------------------------------ Derived data ---------------------------- */

  const fullName = user.full_name || "User";
  const role = user.role || "employee";
  const displayRole = formatRole(role);
  const initials = getInitials(fullName);
  const canReviewDocuments = role === "admin" || role === "manager";

  const completed = profileFields.filter((field) => field.value).length;
  const percent = Math.round((completed / profileFields.length) * 100);
  const barColor =
    percent === 100 ? "bg-emerald-500" : percent >= 60 ? "bg-blue-600" : "bg-amber-500";

  const roleBadge = (
    <span
      className={`inline-flex rounded-md border px-2 py-0.5 text-xs font-semibold ${getRoleBadgeClass(role)}`}
    >
      {displayRole}
    </span>
  );

  const accessItems = [
    { label: "View and manage your own documents", allowed: true },
    { label: "Approve or reject documents in review", allowed: canReviewDocuments },
  ];

  /* -------------------------------- Render -------------------------------- */

  return (
    <div className="min-h-full bg-[#f5f6f8] text-slate-900 antialiased scheme:light">
      {/* Cover */}
      <div className="relative h-36 w-full overflow-hidden sm:h-44" style={coverStyle}>
        {!coverImage && (
          <svg className="absolute inset-0 h-full w-full" aria-hidden="true">
            <defs>
              <pattern id="cover-grid" width="32" height="32" patternUnits="userSpaceOnUse">
                <path d="M32 0H0V32" fill="none" stroke="white" strokeOpacity="0.08" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#cover-grid)" />
          </svg>
        )}

        <div className="relative mx-auto flex h-full max-w-6xl items-start justify-between gap-4 px-4 pt-5 sm:px-6">
          <div className="text-white">
            <h1 className="text-lg font-semibold tracking-tight">My profile</h1>
            <p className="mt-0.5 text-[13px] text-white/75">
              Your account details, access and security.
            </p>
          </div>

          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2">
              {coverStore.image && (
                <button
                  type="button"
                  onClick={handleRemoveCover}
                  className={`rounded-md border border-white/25 bg-black/20 px-3 py-1.5 text-xs font-medium text-white backdrop-blur transition hover:bg-black/30 ${focusRing}`}
                >
                  Remove cover
                </button>
              )}

              <button
                type="button"
                onClick={() => coverInputRef.current?.click()}
                className={`inline-flex items-center gap-1.5 rounded-md border border-white/25 bg-black/20 px-3 py-1.5 text-xs font-medium text-white backdrop-blur transition hover:bg-black/30 ${focusRing}`}
              >
                <LineIcon className="h-3.5 w-3.5">{CameraPaths}</LineIcon>
                {coverStore.image ? "Change cover" : "Add cover"}
              </button>
            </div>

            <div aria-live="polite" className="min-h-5">
              {coverError ? (
                <span className="rounded bg-red-600 px-2 py-0.5 text-xs text-white">{coverError}</span>
              ) : coverMessage ? (
                <span className="rounded bg-black/40 px-2 py-0.5 text-xs text-white backdrop-blur">
                  {coverMessage}
                </span>
              ) : null}
            </div>
          </div>

          <input
            ref={coverInputRef}
            type="file"
            accept="image/*"
            onChange={handleCoverChange}
            className="hidden"
          />
        </div>
      </div>

      <div className="relative z-10 mx-auto max-w-6xl space-y-6 px-4 pb-10 sm:px-6">
        {/* Identity card with tabs */}
        <section className="-mt-14 rounded-lg border border-slate-200 bg-white shadow-sm sm:-mt-16">
          <div className="flex flex-col gap-5 px-5 pt-5 sm:flex-row sm:items-end sm:justify-between sm:px-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-5">
              <div className="-mt-14 shrink-0 sm:-mt-16">
                <div className="relative w-fit">
                  <Avatar
                    src={avatarStore.image}
                    initials={initials}
                    className="h-24 w-24 rounded-full text-2xl shadow-sm ring-4 ring-white sm:h-28 sm:w-28 sm:text-3xl"
                  />

                  <button
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    aria-label="Change profile photo"
                    className={`absolute bottom-0.5 right-0.5 flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 ${focusRing}`}
                  >
                    <LineIcon>{CameraPaths}</LineIcon>
                  </button>

                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="hidden"
                  />
                </div>
              </div>

              <div className="min-w-0 pb-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h2 className="truncate text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
                    {fullName}
                  </h2>
                  {roleBadge}
                  <StatusPill>Active</StatusPill>
                </div>

                <p className="mt-1 truncate text-[13px] text-slate-500">
                  {[user.email, user.department].filter(Boolean).join("  |  ") ||
                    "No contact details on file"}
                </p>

                <div className="mt-1.5 flex min-h-5 flex-wrap items-center gap-x-3 text-xs" aria-live="polite">
                  {photoError ? (
                    <span className="text-red-600">{photoError}</span>
                  ) : photoMessage ? (
                    <span className="text-slate-500">{photoMessage}</span>
                  ) : null}

                  {avatarStore.image && (
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      className={`rounded font-medium text-slate-500 hover:text-red-600 ${focusRing}`}
                    >
                      Remove photo
                    </button>
                  )}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className={`inline-flex items-center justify-center gap-2 self-start rounded-md border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 transition hover:border-red-300 hover:bg-red-50 hover:text-red-700 sm:self-auto ${focusRing}`}
            >
              <LineIcon>{SignOutPaths}</LineIcon>
              Sign out
            </button>
          </div>

          <div
            role="tablist"
            aria-label="Profile sections"
            className="mt-4 flex gap-6 overflow-x-auto border-t border-slate-200 px-5 sm:px-6"
          >
            {TABS.map((tab) => {
              const selected = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  id={`tab-${tab.id}`}
                  role="tab"
                  type="button"
                  aria-selected={selected}
                  aria-controls={`panel-${tab.id}`}
                  onClick={() => setActiveTab(tab.id)}
                  className={`-mb-px whitespace-nowrap border-b-2 py-3 text-sm font-semibold transition ${focusRing} ${
                    selected
                      ? "border-blue-600 text-slate-900"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </section>

        {/* Body */}
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <main className="min-w-0 space-y-6">
            {activeTab === "overview" && (
              <div id="panel-overview" role="tabpanel" aria-labelledby="tab-overview" className="space-y-6">
                <dl className="grid gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-200 sm:grid-cols-2 xl:grid-cols-4">
                  <SummaryCell label="Role" value={displayRole} />
                  <SummaryCell label="Department" value={user.department} />
                  <SummaryCell label="Employee ID" value={user.employee_id} />
                  <SummaryCell label="Member since" value={formatDate(user.created_at)} />
                </dl>

                <Panel title="Account summary" description="Access details for your account.">
                  <dl className="divide-y divide-slate-100">
                    <Row label="Role" value={roleBadge} />
                    <Row label="Status" value={<StatusPill>Active</StatusPill>} />
                    <Row
                      label="Account ID"
                      value={user.id !== undefined ? `#${user.id}` : undefined}
                    />
                    <Row label="Email address" value={user.email} />
                  </dl>
                </Panel>
              </div>
            )}

            {activeTab === "personal" && (
              <div id="panel-personal" role="tabpanel" aria-labelledby="tab-personal">
                <Panel title="Personal information" description="Details linked to your account.">
                  <dl className="divide-y divide-slate-100">
                    {profileFields.map((field) => (
                      <Row key={field.label} label={field.label} value={field.value} />
                    ))}
                  </dl>

                  <p className="border-t border-slate-200 bg-slate-50/60 px-5 py-3 text-xs text-slate-500">
                    These details are read-only. Contact your administrator to request changes.
                  </p>
                </Panel>
              </div>
            )}

            {activeTab === "security" && (
              <div id="panel-security" role="tabpanel" aria-labelledby="tab-security" className="space-y-6">
                <Panel title="Current session" description="The device you are signed in on right now.">
                  <div className="flex items-start gap-4 p-5">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-600">
                      <LineIcon className="h-5 w-5">
                        <rect x="3" y="4" width="18" height="12" rx="2" />
                        <path d="M8 20h8M12 16v4" />
                      </LineIcon>
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-900">{device || "This device"}</p>
                      <p className="mt-0.5 text-[13px] text-slate-500">
                        {timeZone ? `Time zone: ${timeZone}` : "Time zone unavailable"}
                      </p>
                    </div>

                    <StatusPill>Active now</StatusPill>
                  </div>
                </Panel>

                <Panel title="Access and permissions" description="What your role lets you do.">
                  <ul className="divide-y divide-slate-100">
                    {accessItems.map((item) => (
                      <li key={item.label} className="flex items-center justify-between gap-4 px-5 py-3">
                        <span className="text-[13px] font-medium text-slate-900">{item.label}</span>

                        <span
                          className={`inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold ${
                            item.allowed ? "text-emerald-700" : "text-slate-400"
                          }`}
                        >
                          <LineIcon className="h-3.5 w-3.5">
                            {item.allowed ? <path d="m5 12 5 5L20 7" /> : <path d="M18 6 6 18M6 6l12 12" />}
                          </LineIcon>
                          {item.allowed ? "Allowed" : "Not allowed"}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <p className="border-t border-slate-200 bg-slate-50/60 px-5 py-3 text-xs text-slate-500">
                    Permissions come from your role. Contact your administrator to change them.
                  </p>
                </Panel>

                <Panel title="Sign out" description="End your session on this device.">
                  <div className="p-5">
                    <p className="max-w-prose text-[13px] leading-6 text-slate-600">
                      Sign out when you use a shared or public computer so nobody else can open your
                      documents.
                    </p>

                    <button
                      type="button"
                      onClick={handleLogout}
                      className={`mt-4 inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-red-700 transition hover:border-red-300 hover:bg-red-50 ${focusRing}`}
                    >
                      <LineIcon>{SignOutPaths}</LineIcon>
                      Sign out of this device
                    </button>
                  </div>
                </Panel>
              </div>
            )}
          </main>

          {/* Side rail */}
          <aside className="min-w-0 space-y-6">
            <Panel
              title="Profile completeness"
              description="How much of your profile is filled in."
              action={
                <span className="text-lg font-semibold tabular-nums text-slate-900">{percent}%</span>
              }
            >
              <div className="px-5 pt-4">
                <div
                  className="h-1.5 overflow-hidden rounded-full bg-slate-100"
                  role="progressbar"
                  aria-valuenow={percent}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Profile completeness"
                >
                  <div
                    className={`h-full rounded-full transition-all motion-reduce:transition-none ${barColor}`}
                    style={{ width: `${percent}%` }}
                  />
                </div>

                <p className="mt-2 text-xs text-slate-500">
                  {completed} of {profileFields.length} details provided
                </p>
              </div>

              <ul className="mt-2 divide-y divide-slate-100 px-5 pb-1">
                {profileFields.map((field) => (
                  <li key={field.label} className="flex items-center gap-3 py-2.5">
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                        field.value ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400"
                      }`}
                    >
                      <LineIcon className="h-3 w-3">
                        {field.value ? <path d="m5 12 5 5L20 7" /> : <path d="M6 12h12" />}
                      </LineIcon>
                      <span className="sr-only">{field.value ? "Provided" : "Missing"}</span>
                    </span>

                    <span
                      className={`text-[13px] ${
                        field.value ? "font-medium text-slate-900" : "text-slate-500"
                      }`}
                    >
                      {field.label}
                    </span>
                  </li>
                ))}
              </ul>

              {percent < 100 && (
                <p className="border-t border-slate-200 bg-slate-50/60 px-5 py-3 text-xs text-slate-500">
                  Missing details can only be added by your administrator.
                </p>
              )}
            </Panel>

            <Panel title="Photo and cover" description="Where your images are kept.">
              <p className="px-5 py-4 text-[13px] leading-6 text-slate-600">
                Your profile photo and cover are stored in this browser only. They won&apos;t appear
                on other devices or to other people.
              </p>
            </Panel>
          </aside>
        </div>
      </div>
    </div>
  );
}