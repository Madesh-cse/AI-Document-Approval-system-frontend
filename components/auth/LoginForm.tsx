"use client";

import {
  ChangeEvent,
  FormEvent,
  ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { isAxiosError } from "axios";
import api from "@/lib/axios";
import { useAuthStore } from "@/store/authStore";

/**
 * Fonts (optional but recommended) - add once in app/layout.tsx <head>.
 * Icons are inline SVG, so no icon font is needed:
 *
 * <link rel="preconnect" href="https://fonts.googleapis.com" />
 * <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
 * <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
 */

// ── Config ────────────────────────────────────────────────────────────────
const REDIRECT_AFTER_LOGIN = "/dashboard";
// How long the "redirecting to dashboard" overlay stays visible (ms)
const REDIRECT_DELAY_MS = 2400;
const REGISTER_PATH = "/register";
const FORGOT_PASSWORD_PATH = "/forgot-password";

// `family-name:` hint makes these unambiguous in Tailwind v3 and v4
const inter = "font-[family-name:Inter,sans-serif]";
const mono = "font-[family-name:JetBrains_Mono,monospace]";

// Shared field styling: visible border, hover, focus ring, error state
const fieldBase =
  "w-full rounded bg-white py-2.5 text-sm text-[#191c1e] shadow-sm ring-1 ring-inset outline-none transition placeholder:text-[#9b9ca3]";
const fieldNormal =
  "ring-[#c6c6cd] hover:ring-[#76777d] focus:bg-[#f7f9fb] focus:ring-2 focus:ring-[#0058be]";
const fieldError =
  "ring-[#ba1a1a] hover:ring-[#ba1a1a] focus:ring-2 focus:ring-[#ba1a1a]";
const fieldClass = (error?: string) =>
  `${fieldBase} ${error ? fieldError : fieldNormal}`;

type LoginData = {
  email: string;
  password: string;
  remember: boolean;
};

type LoginErrors = Partial<Record<keyof LoginData | "form", string>>;

// ── Inline SVG icons (no font or network needed) ──────────────────────────
const ICONS: Record<string, ReactNode> = {
  document_scanner: (
    <>
      <path d="M3 7V5a2 2 0 0 1 2-2h2" />
      <path d="M17 3h2a2 2 0 0 1 2 2v2" />
      <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
      <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
      <path d="M7 12h10" />
    </>
  ),
  verified_user: (
    <>
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  neurology: (
    <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z" />
  ),
  receipt_long: (
    <>
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
      <path d="M10 9H8M16 13H8M16 17H8" />
    </>
  ),
  bolt: <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />,
  verified: (
    <>
      <path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  task_alt: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  fact_check: (
    <>
      <rect x="8" y="2" width="8" height="4" rx="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="m9 14 2 2 4-4" />
    </>
  ),
  shield: (
    <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
  ),
  shield_lock: (
    <>
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
      <rect x="9.5" y="11" width="5" height="4" rx="0.5" />
      <path d="M10.5 11V9.5a1.5 1.5 0 0 1 3 0V11" />
    </>
  ),
  lock_open: (
    <>
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 9.9-1" />
    </>
  ),
  local_hospital: (
    <path d="M4 9a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h4a1 1 0 0 1 1 1v4a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2v-4a1 1 0 0 1 1-1h4a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2h-4a1 1 0 0 1-1-1V4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4a1 1 0 0 1-1 1z" />
  ),
  gavel: (
    <>
      <path d="m14.5 12.5-8 8a2.119 2.119 0 1 1-3-3l8-8" />
      <path d="m16 16 6-6" />
      <path d="m8 8 6-6" />
      <path d="m9 7 8 8" />
      <path d="m21 11-8-8" />
    </>
  ),
  encrypted: (
    <>
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      <path d="M12 15v3" />
    </>
  ),
  vpn_lock: (
    <>
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </>
  ),
  mail: (
    <>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </>
  ),
  key: (
    <>
      <path d="m21 2-9.6 9.6" />
      <circle cx="7.5" cy="15.5" r="5.5" />
      <path d="m15.5 7.5 3 3L22 7l-3-3" />
    </>
  ),
  visibility: (
    <>
      <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  visibility_off: (
    <>
      <path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49" />
      <path d="M14.084 14.158a3 3 0 0 1-4.242-4.242" />
      <path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143" />
      <path d="m2 2 20 20" />
    </>
  ),
  passkey: (
    <>
      <path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4" />
      <path d="M14 13.12c0 2.38 0 6.38-1 8.88" />
      <path d="M17.29 21.02c.12-.6.43-2.3.5-3.02" />
      <path d="M2 12a10 10 0 0 1 18-6" />
      <path d="M2 16h.01" />
      <path d="M21.8 16c.2-2 .131-5.354 0-6" />
      <path d="M5 19.5C5.5 18 6 15 6 12a6 6 0 0 1 .34-2" />
      <path d="M8.65 22c.21-.66.45-1.32.57-2" />
      <path d="M9 6.8a6 6 0 0 1 9 5.2v2" />
    </>
  ),
  lock: (
    <>
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </>
  ),
  arrow_forward: (
    <>
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </>
  ),
  corporate_fare: (
    <>
      <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
      <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
      <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" />
      <path d="M10 6h4M10 10h4M10 14h4M10 18h4" />
    </>
  ),
  error: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v4M12 16h.01" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4M12 8h.01" />
    </>
  ),
  check_circle: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  loader: <path d="M21 12a9 9 0 1 1-6.219-8.56" />,
  dashboard: (
    <>
      <rect x="3" y="3" width="7" height="9" rx="1" />
      <rect x="14" y="3" width="7" height="5" rx="1" />
      <rect x="14" y="12" width="7" height="9" rx="1" />
      <rect x="3" y="16" width="7" height="5" rx="1" />
    </>
  ),
};

// Only these icons are drawn solid when `filled` is passed
const FILLED_ICONS = new Set(["bolt"]);

function Icon({
  name,
  className = "",
  filled = false,
}: {
  name: string;
  className?: string;
  filled?: boolean;
}) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill={filled && FILLED_ICONS.has(name) ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`inline-block shrink-0 select-none ${className}`}
    >
      {ICONS[name]}
    </svg>
  );
}

function FieldError({ id, message }: { id?: string; message?: string }) {
  if (!message) return null;

  return (
    <p
      id={id}
      role="alert"
      className="flex items-center gap-1 text-[11px] font-medium text-[#ba1a1a]"
    >
      <Icon name="error" className="text-[14px]" />
      {message}
    </p>
  );
}

// ── Static content ────────────────────────────────────────────────────────
const STATS = [
  { value: "14.2M", label: "Docs Processed", width: "83.33%", accent: false },
  { value: "88%", label: "Faster Approvals", width: "91.67%", accent: true },
  { value: "0.0%", label: "Data Leakage", width: "100%", accent: false },
];

const SEALS = [
  { icon: "shield", label: "SOC 2 Type II" },
  { icon: "lock_open", label: "ISO 27001" },
  { icon: "local_hospital", label: "HIPAA Ready" },
  { icon: "gavel", label: "GDPR Compliant" },
  { icon: "encrypted", label: "FIPS 140-3" },
];

const REGIONS = [
  "GovCloud Region",
  "EU Data Residency (Frankfurt)",
  "US Commercial (Default)",
];

const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0058be]";

// Turns an axios / FastAPI error into a readable message
function getLoginErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    if (!error.response) {
      return "Cannot reach the server. Check your connection and try again.";
    }

    const detail = error.response.data?.detail;

    if (typeof detail === "string") return detail;

    // FastAPI validation errors (422) come back as a list
    if (Array.isArray(detail) && detail[0]?.msg) return String(detail[0].msg);

    return "Invalid email or password.";
  }

  return "Something went wrong. Please try again.";
}

// ── Page ──────────────────────────────────────────────────────────────────
export default function LoginForm() {
  const router = useRouter();

  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState<LoginData>({
    email: "",
    password: "",
    remember: true,
  });

  const [errors, setErrors] = useState<LoginErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [notice, setNotice] = useState("");
  const [region, setRegion] = useState("US Commercial (Default)");

  const showDomainBadge = /^\S+@\S+\.\S+$/.test(formData.email.trim());

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    setErrors((prev) => ({
      ...prev,
      [name]: "",
      form: "",
    }));
  };

  const handleRememberChange = (e: ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      remember: e.target.checked,
    }));
  };

  const validateForm = () => {
    const newErrors: LoginErrors = {};

    if (!formData.email.trim()) {
      newErrors.email = "Work email is required.";
    } else if (!/^\S+@\S+\.\S+$/.test(formData.email.trim())) {
      newErrors.email = "Enter a valid email address.";
    }

    if (!formData.password) {
      newErrors.password = "Password is required.";
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  const handlePasskey = () => {
    setNotice("Passkey sign-in is not connected yet.");
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setNotice("");

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // baseURL (http://127.0.0.1:8000/api/v1) is configured in axios.ts
      const { data } = await api.post("/auth/login", {
        email: formData.email.trim(),
        password: formData.password,
      });

      // Persist token + user (localStorage when "Remember", else sessionStorage)
      useAuthStore
        .getState()
        .login(data.access_token, data.user, formData.remember);

      // Show the premium "redirecting" overlay; it navigates when it finishes
      setRedirecting(true);
    } catch (error) {
      setErrors({ form: getLoginErrorMessage(error) });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main
      className={`${inter} relative flex min-h-screen w-full flex-col items-center justify-center overflow-x-hidden bg-[#f7f9fb] px-4 py-8 text-[#191c1e] antialiased sm:px-8`}
    >
      {/* Dotted background */}
      <div className="pointer-events-none absolute inset-0 opacity-40 bg-[radial-gradient(#c6c6cd_1px,transparent_1px)] bg-size-[24px_24px]" />

      <div className="relative mx-auto w-full max-w-7xl py-4 sm:py-8">
        {/* ───────── Top header bar ───────── */}
        <header className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-black text-white shadow-md">
              <Icon name="document_scanner" className="text-[22px]" />
            </div>

            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-base font-semibold tracking-tight text-[#191c1e]">
                  DocuMind
                </span>

                <span
                  className={`${mono} rounded-sm bg-[#131b2e] px-1.5 py-0.5 text-[11px] font-medium text-[#9aa1b8]`}
                >
                  ENTERPRISE
                </span>
              </div>

              <span
                className={`${mono} text-[11px] font-medium text-[#45464d]`}
              >
                Cognitive Document Intelligence Platform
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden items-center gap-2 rounded-full bg-[#f2f4f6] px-3 py-1.5 shadow-sm sm:flex">
              <span className="h-2 w-2 animate-pulse rounded-full bg-[#0058be]" />

              <span
                className={`${mono} text-[11px] font-medium text-[#45464d]`}
              >
                Cluster v4.8: Operational (99.99%)
              </span>
            </div>

            <div
              className={`${mono} flex items-center gap-1 rounded bg-white px-3 py-1.5 text-[11px] font-medium text-[#45464d] shadow-sm ring-1 ring-black/5`}
            >
              <Icon
                name="verified_user"
                className="text-[16px] text-[#0058be]"
              />
              <span>SOC-2 Type II Certified</span>
            </div>
          </div>
        </header>

        {/* ───────── Dual-column layout ───────── */}
        <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12 lg:gap-12">
          {/* ───── Left column ───── */}
          <section className="flex flex-col gap-6 lg:col-span-7">
            {/* Badge + headline */}
            <div className="flex flex-col gap-3">
              <div className="inline-flex items-center gap-2 self-start rounded-full bg-[#0058be]/10 px-3 py-1">
                <Icon name="neurology" className="text-[14px] text-[#0058be]" />

                <span
                  className={`${mono} text-[11px] font-medium uppercase tracking-wider text-[#0058be]`}
                >
                  DocuMind Neural Intelligence 4.0
                </span>
              </div>

              <h1 className="text-[2rem] font-bold leading-10 tracking-tight text-[#191c1e] sm:text-[3rem] sm:leading-14">
                Automate Document Extraction, Auditing, &amp; Multi-Tier
                Approvals.
              </h1>

              <p className="max-w-xl text-base leading-6.5 text-[#45464d]">
                Deterministically extract semantic schemas from complex
                enterprise contracts, tax records, and invoices with
                human-in-the-loop governance.
              </p>
            </div>

            {/* Live pipeline card */}
            <div className="relative overflow-hidden rounded-lg bg-white p-5 shadow-md ring-1 ring-black/5 sm:p-6">
              <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[#0058be]/10 blur-3xl" />

              {/* Card header */}
              <div className="relative mb-5 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded bg-[#e6e8ea] text-[#191c1e]">
                    <Icon name="receipt_long" className="text-[18px]" />
                  </div>

                  <div className="flex flex-col">
                    <span className="break-all text-base font-semibold tracking-[-0.01em] text-[#191c1e]">
                      Master_Service_Agreement_v4.pdf
                    </span>

                    <span
                      className={`${mono} text-[11px] font-medium text-[#45464d]`}
                    >
                      OCR Parsed • Multi-tier Layout Engine
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`${mono} inline-flex items-center gap-1 rounded-sm bg-[#e6e8ea] px-2 py-0.5 text-[11px] font-medium text-[#191c1e]`}
                  >
                    <Icon
                      name="bolt"
                      filled
                      className="text-[14px] text-[#0058be]"
                    />
                    3.12s Run
                  </span>

                  <span
                    className={`${mono} inline-flex items-center gap-1 rounded-full bg-[#0058be]/15 px-2.5 py-0.5 text-[11px] font-medium text-[#0058be]`}
                  >
                    <Icon name="verified" className="text-[14px]" />
                    99.8% Confidence
                  </span>
                </div>
              </div>

              {/* Extraction preview */}
              <div className="relative grid grid-cols-1 gap-4 rounded bg-[#f2f4f6] p-4 md:grid-cols-2">
                {/* OCR field */}
                <div className="flex flex-col gap-2 rounded-sm bg-white p-3 shadow-sm">
                  <div className="flex items-center justify-between pb-1 text-[#45464d]">
                    <span
                      className={`${mono} text-[11px] font-medium uppercase`}
                    >
                      OCR Vector Field #084
                    </span>

                    <span
                      className={`${mono} text-[11px] font-medium text-[#0058be]`}
                    >
                      1024-D
                    </span>
                  </div>

                  <div
                    className={`${mono} flex flex-col gap-1.5 rounded bg-[#e6e8ea]/60 p-2.5 text-xs text-[#191c1e]`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-x-2 rounded-sm bg-[#0058be]/10 px-2 py-1">
                      <span>{'"vendor_legal_entity":'}</span>
                      <span className="font-bold text-[#0058be]">
                        {'"Acrodyne Corp NV"'}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-x-2 px-2 py-0.5">
                      <span className="text-[#45464d]">
                        {'"net_payable_amount":'}
                      </span>
                      <span className="font-semibold">$1,489,200.00</span>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-x-2 px-2 py-0.5">
                      <span className="text-[#45464d]">
                        {'"governing_jurisdiction":'}
                      </span>
                      <span>Delaware, USA</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span
                      className={`${mono} text-[11px] font-medium text-[#45464d]`}
                    >
                      Semantic Anchors
                    </span>

                    <span
                      className={`${mono} text-[11px] font-medium text-[#0058be]`}
                    >
                      4 Anchors Verified
                    </span>
                  </div>
                </div>

                {/* Governance gate */}
                <div className="flex flex-col justify-between gap-2 rounded-sm bg-white p-3 shadow-sm">
                  <div className="flex items-center justify-between pb-1 text-[#45464d]">
                    <span
                      className={`${mono} text-[11px] font-medium uppercase`}
                    >
                      Governance Policy Gate
                    </span>

                    <span
                      className={`${mono} text-[11px] font-medium text-[#0058be]`}
                    >
                      Level 3 Rule
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 rounded bg-[#f2f4f6] p-2">
                      <Icon
                        name="task_alt"
                        className="text-[18px] text-[#0058be]"
                      />

                      <div className="flex flex-col">
                        <span
                          className={`${mono} text-[11px] font-semibold text-[#191c1e]`}
                        >
                          Tax Compliance Match
                        </span>

                        <span
                          className={`${mono} text-[11px] font-medium text-[#45464d]`}
                        >
                          W-9 and EIN validated vs Treasury DB
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 rounded bg-[#f2f4f6] p-2">
                      <Icon
                        name="fact_check"
                        className="text-[18px] text-[#0058be]"
                      />

                      <div className="flex flex-col">
                        <span
                          className={`${mono} text-[11px] font-semibold text-[#191c1e]`}
                        >
                          Human-in-the-Loop Signed
                        </span>

                        <span
                          className={`${mono} text-[11px] font-medium text-[#45464d]`}
                        >
                          Auditor: E. Vance (VP Financial Ops)
                        </span>
                      </div>
                    </div>
                  </div>

                  <div
                    className={`${mono} flex items-center justify-between pt-1 text-[11px] font-medium`}
                  >
                    <span className="text-[#45464d]">Auto-Dispatch</span>
                    <span className="text-[#0058be]">SAP ERP Synced ✓</span>
                  </div>
                </div>
              </div>

              {/* Footer meta */}
              <div
                className={`${mono} relative mt-4 flex flex-wrap items-center justify-between gap-3 pt-2 text-[11px] font-medium text-[#45464d]`}
              >
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[#0058be]" />
                  <span>
                    Vector Hash:{" "}
                    <code className="text-[#191c1e]">0x89e2...cf10</code>
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                  <span>Token Cost: $0.0018</span>
                  <span className="font-semibold text-[#191c1e]">
                    Deterministic Pipeline V4
                  </span>
                </div>
              </div>
            </div>

            {/* Stat counters */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {STATS.map((stat) => (
                <div
                  key={stat.label}
                  className="flex flex-col rounded-lg bg-white p-4 shadow-sm ring-1 ring-black/5"
                >
                  <span
                    className={`text-[2rem] font-bold leading-10 tracking-tight ${
                      stat.accent ? "text-[#0058be]" : "text-[#191c1e]"
                    }`}
                  >
                    {stat.value}
                  </span>

                  <span className="text-xs font-semibold text-[#45464d]">
                    {stat.label}
                  </span>

                  <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-[#e6e8ea]">
                    <div
                      className="h-full bg-[#0058be]"
                      style={{ width: stat.width }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Compliance seals */}
            <div className="flex flex-col gap-2 pt-1">
              <span
                className={`${mono} text-[11px] font-medium uppercase tracking-wider text-[#45464d]`}
              >
                Engineered for Regulated Institutions
              </span>

              <div className="flex flex-wrap items-center gap-3 py-1">
                {SEALS.map((seal) => (
                  <div
                    key={seal.label}
                    className="flex items-center gap-1.5 rounded bg-[#f2f4f6] px-3 py-1.5 text-[#45464d] shadow-sm"
                  >
                    <Icon
                      name={seal.icon}
                      className="text-[16px] text-[#191c1e]"
                    />

                    <span className={`${mono} text-[11px] font-semibold`}>
                      {seal.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ───── Right column: login ───── */}
          <section className="flex flex-col lg:col-span-5">
            <div className="relative overflow-hidden rounded-lg bg-white p-5 shadow-xl ring-1 ring-black/5 sm:p-8">
              <div className="pointer-events-none absolute -right-24 -top-24 h-60 w-60 rounded-full bg-[#0058be]/5 blur-2xl" />

              {/* Header */}
              <div className="relative mb-6 flex flex-col gap-1">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`${mono} text-[11px] font-medium uppercase tracking-widest text-[#0058be]`}
                  >
                    Secured Authentication
                  </span>

                  <span
                    className={`${mono} inline-flex items-center gap-1 rounded-sm bg-[#eceef0] px-2 py-0.5 text-[11px] font-medium text-[#45464d]`}
                  >
                    <Icon name="vpn_lock" className="text-[12px] text-[#0058be]" />
                    TLS 1.3
                  </span>
                </div>

                <h2 className="mt-1 text-[1.75rem] font-semibold leading-9 tracking-[-0.02em] text-[#191c1e] sm:text-[2rem] sm:leading-10">
                  Welcome back to DocuMind
                </h2>

                <p className="text-sm leading-5.5 text-[#45464d]">
                  Sign in to access your organization&apos;s document review
                  queues and audit pipelines.
                </p>
              </div>

              {/* SSO */}
              <div className="relative mb-6 flex flex-col gap-2">
                <button
                  type="button"
                  className={`flex w-full items-center justify-center gap-3 rounded bg-[#f2f4f6] px-4 py-2.5 text-sm font-semibold text-[#191c1e] shadow-sm transition hover:bg-[#eceef0] ${focusRing}`}
                >
                  <svg
                    className="h-4 w-4"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      fill="#EA4335"
                    />
                  </svg>

                  <span>Continue with Google Workspace</span>
                </button>

                <button
                  type="button"
                  className={`flex w-full items-center justify-center gap-3 rounded bg-[#f2f4f6] px-4 py-2.5 text-sm font-semibold text-[#191c1e] shadow-sm transition hover:bg-[#eceef0] ${focusRing}`}
                >
                  <svg
                    className="h-4 w-4"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path d="M1 1h10v10H1z" fill="#F25022" />
                    <path d="M1 13h10v10H1z" fill="#00A4EF" />
                    <path d="M13 1h10v10H13z" fill="#7FBA00" />
                    <path d="M13 13h10v10H13z" fill="#FFB900" />
                  </svg>

                  <span>Continue with Microsoft Azure AD / Okta SAML</span>
                </button>
              </div>

              {/* Separator */}
              <div className="relative my-4 flex items-center justify-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="h-px w-full bg-[#e0e3e5]" />
                </div>

                <span
                  className={`${mono} relative bg-white px-3 text-[11px] font-medium uppercase tracking-wider text-[#45464d]`}
                >
                  Or corporate credentials
                </span>
              </div>

              {/* Credential form */}
              <form
                onSubmit={handleSubmit}
                noValidate
                className="relative flex flex-col gap-4"
              >
                {/* Server / form-level error */}
                {errors.form && (
                  <div
                    role="alert"
                    className="flex items-start gap-2 rounded bg-[#ffdad6] px-3 py-2.5 text-xs font-medium text-[#93000a]"
                  >
                    <Icon name="error" className="mt-px text-[16px]" />
                    {errors.form}
                  </div>
                )}

                {/* Email */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <label
                      htmlFor="work-email"
                      className="text-xs font-semibold text-[#191c1e]"
                    >
                      Work Email Address
                    </label>

                    {showDomainBadge && (
                      <span
                        className={`${mono} rounded-sm bg-[#0058be]/10 px-2 py-0.5 text-[11px] font-medium text-[#0058be]`}
                      >
                        Corporate SSO Auto-Routed
                      </span>
                    )}
                  </div>

                  <div className="relative flex items-center">
                    <Icon
                      name="mail"
                      className="pointer-events-none absolute left-3 text-[18px] text-[#76777d]"
                    />

                    <input
                      id="work-email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="name@company.com"
                      required
                      autoComplete="email"
                      aria-invalid={!!errors.email}
                      aria-describedby={
                        errors.email ? "work-email-error" : undefined
                      }
                      className={`${fieldClass(errors.email)} pl-10 pr-4`}
                    />
                  </div>

                  <FieldError id="work-email-error" message={errors.email} />

                  {!errors.email && (
                    <p className="text-xs leading-4.5 text-[#45464d]">
                      SSO redirect triggers automatically for whitelisted
                      identity providers.
                    </p>
                  )}
                </div>

                {/* Password */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <label
                      htmlFor="work-password"
                      className="text-xs font-semibold text-[#191c1e]"
                    >
                      Password
                    </label>

                    <a
                      href={FORGOT_PASSWORD_PATH}
                      className={`${mono} rounded-sm text-[11px] font-medium text-[#0058be] hover:underline ${focusRing}`}
                    >
                      Forgot password?
                    </a>
                  </div>

                  <div className="relative flex items-center">
                    <Icon
                      name="key"
                      className="pointer-events-none absolute left-3 text-[18px] text-[#76777d]"
                    />

                    <input
                      id="work-password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="Enter your password"
                      required
                      autoComplete="current-password"
                      aria-invalid={!!errors.password}
                      aria-describedby={
                        errors.password ? "work-password-error" : undefined
                      }
                      className={`${fieldClass(errors.password)} pl-10 pr-11`}
                    />

                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                      className={`absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded text-[#76777d] transition-colors hover:text-[#191c1e] ${focusRing}`}
                    >
                      <Icon
                        name={showPassword ? "visibility_off" : "visibility"}
                        className="text-[20px]"
                      />
                    </button>
                  </div>

                  <FieldError
                    id="work-password-error"
                    message={errors.password}
                  />
                </div>

                {/* Remember + passkey */}
                <div className="flex flex-col justify-between gap-2 pt-1 sm:flex-row sm:items-center">
                  <label className="flex cursor-pointer select-none items-center gap-2">
                    <input
                      type="checkbox"
                      name="remember"
                      checked={formData.remember}
                      onChange={handleRememberChange}
                      className={`h-4 w-4 cursor-pointer rounded-sm accent-black ${focusRing}`}
                    />

                    <span className="text-xs text-[#191c1e]">
                      Remember workstation (30d)
                    </span>
                  </label>

                  <button
                    type="button"
                    onClick={handlePasskey}
                    className={`${mono} flex items-center gap-1.5 rounded-sm py-1 text-[11px] font-medium text-[#0058be] transition-colors hover:text-black ${focusRing}`}
                  >
                    <Icon name="passkey" className="text-[16px]" />
                    <span>Use YubiKey / WebAuthn</span>
                  </button>
                </div>

                {/* Notices */}
                {notice && (
                  <div
                    role="status"
                    className="flex items-center gap-2 rounded bg-[#d8e2ff] px-3 py-2.5 text-xs font-medium text-[#001a42]"
                  >
                    <Icon name="info" className="text-[18px]" />
                    {notice}
                  </div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={isSubmitting || redirecting}
                  className={`mt-1 flex w-full items-center justify-center gap-2 rounded bg-black px-4 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-[#2d3133] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 ${focusRing}`}
                >
                  <Icon name="lock" className="text-[16px]" />

                  <span>
                    {isSubmitting
                      ? "Authenticating..."
                      : redirecting
                        ? "Signed in"
                        : "Sign In to Enterprise Workspace"}
                  </span>
                </button>
              </form>

              {/* Register switcher */}
              <div className="relative -mx-5 -mb-5 mt-6 flex flex-col items-center gap-2 bg-[#f2f4f6]/70 px-5 py-4 text-center sm:-mx-8 sm:-mb-8 sm:px-8">
                <span className="text-xs text-[#45464d]">
                  Don&apos;t have an account yet?
                </span>

                <div className="flex flex-wrap items-center justify-center gap-3">
                  <a
                    href={REGISTER_PATH}
                    className={`flex items-center gap-1 rounded-sm text-xs font-semibold text-[#0058be] hover:underline ${focusRing}`}
                  >
                    <span>Create an account</span>
                    <Icon name="arrow_forward" className="text-[14px]" />
                  </a>

                  <span className="text-[#45464d]/40">•</span>

                  <a
                    href="#support"
                    className={`${mono} rounded-sm text-[11px] font-medium text-[#45464d] hover:text-[#191c1e] ${focusRing}`}
                  >
                    IT Admin Helpdesk
                  </a>
                </div>
              </div>
            </div>

            {/* Legal micro-print */}
            <div className="mt-4 flex flex-col gap-1 px-2 text-center sm:text-left">
              <p
                className={`${mono} flex items-center justify-center gap-1 text-[11px] font-medium text-[#45464d] sm:justify-start`}
              >
                <Icon name="shield_lock" className="text-[14px] text-[#0058be]" />
                Encrypted with AES-256 GCM in Zero-Knowledge Vault
                architecture.
              </p>

              <div
                className={`${mono} flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] font-medium text-[#45464d] sm:justify-start`}
              >
                <a className="hover:underline" href="#privacy">
                  Privacy Policy
                </a>
                <span>•</span>
                <a className="hover:underline" href="#terms">
                  Customer Terms of Service
                </a>
                <span>•</span>
                <a className="hover:underline" href="#dpa">
                  Enterprise DPA
                </a>
                <span>•</span>
                <a className="text-[#0058be] hover:underline" href="#status">
                  System Status
                </a>
              </div>
            </div>
          </section>
        </div>

        {/* ───────── Workspace switcher ribbon ───────── */}
        <div className="mt-8 flex flex-col items-center justify-between gap-4 rounded-lg bg-white p-4 shadow-sm ring-1 ring-black/5 md:flex-row">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0058be]/15 text-[#0058be]">
              <Icon name="corporate_fare" className="text-[16px]" />
            </div>

            <div className="flex flex-col">
              <span className="text-xs font-semibold text-[#191c1e]">
                Multi-Tenant Dedicated Cluster Routing
              </span>

              <span
                className={`${mono} text-[11px] font-medium text-[#45464d]`}
              >
                FedRAMP, GovCloud, and On-Premises Air-Gapped instances
                selectable
              </span>
            </div>
          </div>

          <div
            role="group"
            aria-label="Deployment region"
            className="flex flex-wrap items-center justify-center gap-2"
          >
            {REGIONS.map((item) => {
              const active = item === region;

              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => setRegion(item)}
                  aria-pressed={active}
                  className={`${mono} rounded px-3 py-1.5 text-[11px] text-[#191c1e] transition-colors ${focusRing} ${
                    active
                      ? "bg-[#e6e8ea] font-semibold"
                      : "bg-[#f2f4f6] font-medium hover:bg-[#eceef0]"
                  }`}
                >
                  {item}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {redirecting && (
        <RedirectOverlay
          email={formData.email.trim()}
          duration={REDIRECT_DELAY_MS}
          onDone={() => router.push(REDIRECT_AFTER_LOGIN)}
        />
      )}
    </main>
  );
}

// ── "Redirecting to dashboard" overlay ────────────────────────────────────
const REDIRECT_STEPS = [
  "Credentials verified",
  "Secure session established",
  "Preparing your dashboard",
];

function RedirectOverlay({
  email,
  duration,
  onDone,
}: {
  email: string;
  duration: number;
  onDone: () => void;
}) {
  const [visible, setVisible] = useState(false);
  const [filled, setFilled] = useState(false);
  const [step, setStep] = useState(0);

  // Keep the latest callback without restarting the timers
  const onDoneRef = useRef(onDone);

  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    const timers = [
      // Small delay so the fade-in and progress bar transitions actually run
      setTimeout(() => {
        setVisible(true);
        setFilled(true);
      }, 50),
      setTimeout(() => setStep(1), duration * 0.25),
      setTimeout(() => setStep(2), duration * 0.5),
      setTimeout(() => setStep(3), duration * 0.78),
      setTimeout(() => onDoneRef.current(), duration),
    ];

    // Lock page scroll while the overlay is open
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      timers.forEach(clearTimeout);
      document.body.style.overflow = previousOverflow;
    };
  }, [duration]);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Signed in. Redirecting to your dashboard."
      className={`fixed inset-0 z-50 flex items-center justify-center bg-[#131b2e]/60 px-4 backdrop-blur-sm transition-opacity duration-300 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      <div
        className={`relative w-full max-w-md overflow-hidden rounded-lg bg-white shadow-2xl ring-1 ring-black/5 transition-all duration-300 ${
          visible
            ? "translate-y-0 scale-100 opacity-100"
            : "translate-y-2 scale-95 opacity-0"
        }`}
      >
        {/* Premium accent bar */}
        <div className="h-1.5 w-full bg-[linear-gradient(90deg,#0058be,#2170e4,#7073ff)]" />

        {/* Ambient glow */}
        <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-[#0058be]/10 blur-3xl" />

        <div className="relative flex flex-col items-center px-6 pb-7 pt-8 text-center sm:px-8">
          {/* Icon */}
          <div className="relative flex h-20 w-20 items-center justify-center">
            <span className="absolute inset-0 animate-ping rounded-full bg-[#0058be]/15 [animation-duration:2.4s] motion-reduce:animate-none" />
            <span className="absolute inset-0 rounded-full bg-[#0058be]/10" />

            <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-black text-white shadow-lg">
              <Icon name="verified_user" className="text-[28px]" />
            </span>
          </div>

          {/* Chip */}
          <span
            className={`${mono} mt-5 inline-flex items-center gap-1 rounded-full bg-[#d8e2ff] px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-[#001a42]`}
          >
            <Icon name="lock" className="text-[12px]" />
            Secure Session Established
          </span>

          <h2 className="mt-3 text-[1.75rem] font-semibold leading-9 tracking-[-0.02em] text-[#191c1e]">
            Welcome back
          </h2>

          <p className="mt-2 max-w-xs text-sm leading-5.5 text-[#45464d]">
            {email ? (
              <>
                Signed in as{" "}
                <span className="break-all font-semibold text-[#191c1e]">
                  {email}
                </span>
                .{" "}
              </>
            ) : null}
            Redirecting you to your Dashboard…
          </p>

          {/* Steps */}
          <ul className="mt-5 w-full space-y-1.5 rounded bg-[#f2f4f6] p-3 text-left">
            {REDIRECT_STEPS.map((label, i) => {
              const done = step > i;
              const active = step === i;

              return (
                <li key={label} className="flex items-center gap-2.5">
                  {done ? (
                    <Icon
                      name="check_circle"
                      className="text-[18px] text-[#0058be]"
                    />
                  ) : active ? (
                    <Icon
                      name="loader"
                      className="animate-spin text-[18px] text-[#0058be] motion-reduce:animate-none"
                    />
                  ) : (
                    <span className="h-4.5 w-4.5 rounded-full border-2 border-[#c6c6cd]" />
                  )}

                  <span
                    className={`text-sm transition-colors ${
                      done
                        ? "font-medium text-[#191c1e]"
                        : active
                          ? "font-semibold text-[#191c1e]"
                          : "text-[#9b9ca3]"
                    }`}
                  >
                    {label}
                  </span>
                </li>
              );
            })}
          </ul>

          {/* Progress */}
          <div className="mt-5 w-full">
            <div
              className={`${mono} mb-1.5 flex items-center justify-between text-[11px] font-medium text-[#45464d]`}
            >
              <span className="flex items-center gap-1">
                <Icon name="dashboard" className="text-[14px] text-[#0058be]" />
                Redirecting to Dashboard
              </span>

              <span className="text-[#0058be]">DocuMind</span>
            </div>

            <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#e0e3e5]">
              <div
                className="h-full rounded-full bg-[linear-gradient(90deg,#0058be,#2170e4)] transition-[width] ease-linear"
                style={{
                  width: filled ? "100%" : "0%",
                  transitionDuration: `${duration}ms`,
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}