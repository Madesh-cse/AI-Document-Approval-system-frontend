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

/**
 * Optional default cover shown until the user uploads their own.
 * Put a file in /public and set a path such as "/profile-cover.jpg".
 * With null, a generated blue pattern is used.
 */
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

const NAV_ITEMS: { id: TabId; label: string; icon: ReactNode }[] = [
  {
    id: "overview",
    label: "Overview",
    icon: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </>
    ),
  },
  {
    id: "personal",
    label: "Personal information",
    icon: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </>
    ),
  },
  {
    id: "security",
    label: "Security",
    icon: <path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z" />,
  },
];

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

/**
 * Crops the image to the target aspect ratio (from the centre), shrinks it
 * to at most the target size (never upscales) and returns a JPEG data URL.
 */
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
      <img
        src={src}
        alt="Profile photo"
        className={`${className} object-cover`}
      />
    );
  }

  return (
    <div
      className={`${className} flex items-center justify-center bg-blue-100 font-bold text-blue-600`}
    >
      {initials}
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </dt>

      <dd className="mt-1.5 text-sm">
        {value ? (
          <span className="font-medium text-slate-900">{value}</span>
        ) : (
          <span className="text-slate-400">Not provided</span>
        )}
      </dd>
    </div>
  );
}

function FactRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 text-sm">
      <span className="text-slate-500">{label}</span>

      {value ? (
        <span className="truncate font-medium text-slate-800">{value}</span>
      ) : (
        <span className="text-slate-400">Not provided</span>
      )}
    </div>
  );
}

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

      <div className="p-6">{children}</div>
    </section>
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
      setPhotoError(
        error instanceof Error ? error.message : "Unable to use this image.",
      );
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
      const dataUrl = await prepareImage(
        file,
        MAX_COVER_BYTES,
        1920,
        600,
        0.82,
      );

      setCoverMessage(
        coverStore.save(dataUrl)
          ? "Cover updated on this device."
          : "Cover updated for this session only.",
      );
    } catch (error) {
      setCoverError(
        error instanceof Error ? error.message : "Unable to use this image.",
      );
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
        backgroundImage: `linear-gradient(180deg, rgba(15,23,42,0.55) 0%, rgba(15,23,42,0.1) 55%, rgba(15,23,42,0.3) 100%), url("${coverImage}")`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }
    : {
        backgroundImage:
          "linear-gradient(120deg, #1e3a8a 0%, #1d4ed8 55%, #3b82f6 100%)",
      };

  if (!user) {
    return (
      <div className="min-h-full bg-slate-50 scheme:light">
        <div className="animate-pulse">
          <div className="h-48 w-full bg-slate-200 sm:h-56 lg:h-64" />

          <div className="mx-auto mt-6 grid max-w-6xl grid-cols-1 gap-6 px-4 sm:px-6 lg:grid-cols-[300px_minmax(0,1fr)]">
            <div className="h-96 rounded-xl border border-slate-200 bg-white" />
            <div className="h-96 rounded-xl border border-slate-200 bg-white" />
          </div>
        </div>
      </div>
    );
  }

  const fullName = user.full_name || "User";
  const role = user.role || "employee";
  const displayRole = formatRole(role);
  const initials = getInitials(fullName);

  const completed = profileFields.filter((field) => field.value).length;
  const percent = Math.round((completed / profileFields.length) * 100);
  const missing = profileFields
    .filter((field) => !field.value)
    .map((field) => field.label);

  return (
    <div className="min-h-full bg-slate-50 text-slate-900 scheme:light">
      {/* Cover (full width) */}
      <div
        className="relative h-48 w-full overflow-hidden sm:h-56 lg:h-64"
        style={coverStyle}
      >
        {!coverImage && (
          <svg className="absolute inset-0 h-full w-full" aria-hidden="true">
            <defs>
              <pattern
                id="cover-dots"
                width="24"
                height="24"
                patternUnits="userSpaceOnUse"
              >
                <circle cx="2" cy="2" r="1.2" fill="white" fillOpacity="0.18" />
              </pattern>
            </defs>

            <rect width="100%" height="100%" fill="url(#cover-dots)" />
            <circle
              cx="88%"
              cy="-10%"
              r="180"
              fill="white"
              fillOpacity="0.07"
            />
            <circle
              cx="72%"
              cy="120%"
              r="140"
              fill="white"
              fillOpacity="0.07"
            />
          </svg>
        )}

        <div className="relative mx-auto h-full max-w-6xl px-4 sm:px-6">
          <div className="pt-5 text-white">
            <h1 className="text-xl font-semibold">Profile</h1>

            <p className="mt-1 text-sm text-white/80">
              Your account details and access information.
            </p>
          </div>

          <div className="absolute bottom-4 right-4 flex flex-col items-end gap-2 sm:right-6">
            <div aria-live="polite">
              {coverError ? (
                <span className="rounded-md bg-red-600/90 px-2.5 py-1 text-xs text-white">
                  {coverError}
                </span>
              ) : coverMessage ? (
                <span className="rounded-md bg-slate-900/60 px-2.5 py-1 text-xs text-white backdrop-blur">
                  {coverMessage}
                </span>
              ) : null}
            </div>

            <div className="flex items-center gap-2">
              {coverStore.image && (
                <button
                  type="button"
                  onClick={handleRemoveCover}
                  className="rounded-lg border border-white/30 bg-white/15 px-3 py-2 text-xs font-medium text-white backdrop-blur transition-colors hover:bg-white/25"
                >
                  Remove
                </button>
              )}

              <button
                type="button"
                onClick={() => coverInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/30 bg-white/15 px-3 py-2 text-xs font-medium text-white backdrop-blur transition-colors hover:bg-white/25"
              >
                <LineIcon>
                  <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
                  <circle cx="12" cy="13" r="3.5" />
                </LineIcon>
                {coverStore.image ? "Change cover" : "Add cover image"}
              </button>
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

      <div className="relative z-10 mx-auto max-w-6xl px-4 pb-8 sm:px-6">
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
          {/* Sidebar */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="px-6 pb-5">
                <div className="-mt-14 flex justify-center">
                  <div className="relative">
                    <Avatar
                      src={avatarStore.image}
                      initials={initials}
                      className="h-28 w-28 rounded-full text-3xl shadow ring-4 ring-white"
                    />

                    <button
                      type="button"
                      onClick={() => photoInputRef.current?.click()}
                      aria-label="Change profile photo"
                      className="absolute bottom-1 right-1 flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white shadow ring-2 ring-white transition-colors hover:bg-blue-700"
                    >
                      <LineIcon>
                        <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
                        <circle cx="12" cy="13" r="3.5" />
                      </LineIcon>
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

                <div className="mt-4 text-center">
                  <h2 className="truncate text-lg font-semibold text-slate-900">
                    {fullName}
                  </h2>

                  {user.email && (
                    <p className="mt-0.5 truncate text-sm text-slate-500">
                      {user.email}
                    </p>
                  )}

                  <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${getRoleBadgeClass(
                        role,
                      )}`}
                    >
                      {displayRole}
                    </span>

                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      Active
                    </span>
                  </div>

                  <div className="mt-3 min-h-4 text-xs" aria-live="polite">
                    {photoError ? (
                      <span className="text-red-600">{photoError}</span>
                    ) : photoMessage ? (
                      <span className="text-slate-500">{photoMessage}</span>
                    ) : null}
                  </div>

                  {avatarStore.image && (
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      className="mt-1 text-xs font-medium text-slate-500 hover:text-red-600"
                    >
                      Remove photo
                    </button>
                  )}
                </div>

                <div className="mt-4 divide-y divide-slate-100 border-t border-slate-100">
                  <FactRow label="Department" value={user.department} />
                  <FactRow label="Employee ID" value={user.employee_id} />
                  <FactRow
                    label="Member since"
                    value={formatDate(user.created_at)}
                  />
                </div>
              </div>

              <nav
                aria-label="Profile sections"
                className="border-t border-slate-100 p-2"
              >
                {NAV_ITEMS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveTab(item.id)}
                    aria-current={activeTab === item.id ? "page" : undefined}
                    className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                      activeTab === item.id
                        ? "bg-blue-50 text-blue-700"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <LineIcon>{item.icon}</LineIcon>
                    {item.label}
                  </button>
                ))}
              </nav>

              <div className="border-t border-slate-100 p-2">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
                >
                  <LineIcon>
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <path d="m16 17 5-5-5-5" />
                    <path d="M21 12H9" />
                  </LineIcon>
                  Sign out
                </button>
              </div>
            </div>
          </aside>

          {/* Content */}
          <main className="min-w-0 space-y-6">
            {activeTab === "overview" && (
              <>
                <Card
                  title="Profile completeness"
                  description="How much of your profile is filled in."
                >
                  <div className="flex items-end justify-between">
                    <p className="text-sm text-slate-600">
                      <span className="font-semibold text-slate-900">
                        {completed} of {profileFields.length}
                      </span>{" "}
                      details provided
                    </p>

                    <p className="text-2xl font-semibold text-slate-900">
                      {percent}%
                    </p>
                  </div>

                  <div
                    className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"
                    role="progressbar"
                    aria-valuenow={percent}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label="Profile completeness"
                  >
                    <div
                      className="h-full rounded-full bg-blue-600 transition-all"
                      style={{ width: `${percent}%` }}
                    />
                  </div>

                  {missing.length > 0 ? (
                    <div className="mt-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Missing
                      </p>

                      <div className="mt-2 flex flex-wrap gap-2">
                        {missing.map((label) => (
                          <span
                            key={label}
                            className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-600"
                          >
                            {label}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="mt-4 text-xs text-emerald-600">
                      Your profile is complete.
                    </p>
                  )}
                </Card>

                <Card
                  title="Account summary"
                  description="Access details for your account."
                >
                  <dl className="grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2">
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Role
                      </dt>

                      <dd className="mt-1.5">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${getRoleBadgeClass(
                            role,
                          )}`}
                        >
                          {displayRole}
                        </span>
                      </dd>
                    </div>

                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Status
                      </dt>

                      <dd className="mt-1.5">
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          Active
                        </span>
                      </dd>
                    </div>

                    <Field
                      label="Account ID"
                      value={user.id !== undefined ? `#${user.id}` : undefined}
                    />

                    <Field
                      label="Member since"
                      value={formatDate(user.created_at)}
                    />
                  </dl>
                </Card>
              </>
            )}

            {activeTab === "personal" && (
              <Card
                title="Personal information"
                description="Details linked to your account."
              >
                <dl className="grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2">
                  {profileFields.map((field) => (
                    <Field
                      key={field.label}
                      label={field.label}
                      value={field.value}
                    />
                  ))}
                </dl>

                <p className="mt-6 border-t border-slate-100 pt-4 text-xs text-slate-400">
                  These details are read-only. Contact your administrator to
                  request changes.
                </p>
              </Card>
            )}

            {activeTab === "security" && (
              <>
                <Card
                  title="Current session"
                  description="The device you are signed in on right now."
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                      <LineIcon className="h-5 w-5">
                        <rect x="3" y="4" width="18" height="12" rx="2" />
                        <path d="M8 20h8M12 16v4" />
                      </LineIcon>
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-900">
                        {device || "This device"}
                      </p>

                      <p className="mt-0.5 text-xs text-slate-500">
                        {timeZone
                          ? `Time zone: ${timeZone}`
                          : "Time zone unavailable"}
                      </p>
                    </div>

                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      Active now
                    </span>
                  </div>
                </Card>

                <Card
                  title="Sign out"
                  description="End your session on this device."
                >
                  <p className="text-sm leading-relaxed text-slate-600">
                    Sign out when you use a shared or public computer so
                    nobody else can open your documents.
                  </p>

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="mt-4 inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
                  >
                    <LineIcon>
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                      <path d="m16 17 5-5-5-5" />
                      <path d="M21 12H9" />
                    </LineIcon>
                    Sign out of this device
                  </button>
                </Card>
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}