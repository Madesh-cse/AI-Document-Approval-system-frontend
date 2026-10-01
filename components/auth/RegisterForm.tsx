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

// `family-name:` hint makes these unambiguous in Tailwind v3 and v4
const inter = "font-[family-name:Inter,sans-serif]";
const mono = "font-[family-name:JetBrains_Mono,monospace]";

// Where to go after the user confirms the success modal
const LOGIN_PATH = "/login";

// Shared field styling: visible border, hover, focus ring, error state
const fieldBase =
  "w-full rounded bg-white px-3 py-2.5 text-sm text-[#191c1e] shadow-sm ring-1 ring-inset outline-none transition placeholder:text-[#9b9ca3]";
const fieldNormal =
  "ring-[#c6c6cd] hover:ring-[#76777d] focus:bg-[#f7f9fb] focus:ring-2 focus:ring-[#0058be]";
const fieldError =
  "ring-[#ba1a1a] hover:ring-[#ba1a1a] focus:ring-2 focus:ring-[#ba1a1a]";
const fieldClass = (error?: string) =>
  `${fieldBase} ${error ? fieldError : fieldNormal}`;

type FormData = {
  firstName: string;
  lastName: string;
  email: string;
  organization: string;
  workflowDomain: string;
  role: "employee" | "manager";
  password: string;
  terms: boolean;
};

type FormErrors = Partial<Record<keyof FormData, string>>;

const ICONS: Record<string, ReactNode> = {
  account_tree: (
    <>
      <rect x="2" y="9" width="6" height="6" rx="1" />
      <rect x="16" y="3" width="6" height="6" rx="1" />
      <rect x="16" y="15" width="6" height="6" rx="1" />
      <path d="M8 12h4M12 6v12M12 6h4M12 18h4" />
    </>
  ),
  document_scanner: (
    <>
      <path d="M3 7V5a2 2 0 0 1 2-2h2" />
      <path d="M17 3h2a2 2 0 0 1 2 2v2" />
      <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
      <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
      <path d="M7 12h10" />
    </>
  ),
  verified: (
    <>
      <path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  psychology: (
    <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z" />
  ),
  rule_settings: (
    <>
      <path d="m3 17 2 2 4-4" />
      <path d="m3 7 2 2 4-4" />
      <path d="M13 6h8M13 12h8M13 18h8" />
    </>
  ),
  encrypted: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),
  format_quote: (
    <>
      <path d="M16 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z" />
      <path d="M5 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z" />
    </>
  ),
  bolt: <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />,
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
  expand_more: <path d="m6 9 6 6 6-6" />,
  arrow_forward: (
    <>
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </>
  ),
  error: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v4M12 16h.01" />
    </>
  ),
  check_circle: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  lock: (
    <>
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </>
  ),
  verified_user: (
    <>
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  cloud_done: (
    <>
      <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
      <path d="m9 14 2 2 4-4" />
    </>
  ),
};

// Only these icons are drawn solid when `filled` is passed
const FILLED_ICONS = new Set(["bolt"]);

// Inline SVG icons: no font or network needed, size follows the text-[..px] class
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
      <Icon name="error" filled className="text-[14px]" />
      {message}
    </p>
  );
}

export default function RegisterForm() {
  const router = useRouter();

  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    firstName: "",
    lastName: "",
    email: "",
    organization: "",
    workflowDomain: "Finance & Accounting",
    role: "employee",
    password: "",
    terms: false,
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registeredUser, setRegisteredUser] = useState<{
    name: string;
    email: string;
  } | null>(null);

  const password = formData.password;

  let score = 0;

  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password) && /[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  const strengthLabel =
    password.length === 0
      ? "Minimum 12 characters"
      : score <= 1
        ? "Weak entropy"
        : score === 2
          ? "Moderate security"
          : score === 3
            ? "Strong enterprise hash"
            : "Maximum cryptographic depth";

  const strengthColor =
    password.length === 0
      ? "text-[#76777d]"
      : score <= 1
        ? "text-[#ba1a1a]"
        : "text-[#0058be]";

  const barColor = (idx: number) => {
    if (idx >= score) return "bg-[#e0e3e5]";
    if (score <= 1) return "bg-[#ba1a1a]";
    if (score === 2) return "bg-[#2170e4]";
    return "bg-[#0058be]";
  };

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    setErrors((prev) => ({
      ...prev,
      [name]: "",
    }));
  };

  const handleTermsChange = (e: ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      terms: e.target.checked,
    }));

    setErrors((prev) => ({
      ...prev,
      terms: "",
    }));
  };

  const validateForm = () => {
    const newErrors: FormErrors = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = "First name is required.";
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = "Last name is required.";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Work email is required.";
    } else if (!/^\S+@\S+\.\S+$/.test(formData.email)) {
      newErrors.email = "Enter a valid email address.";
    }

    if (!formData.organization.trim()) {
      newErrors.organization = "Organization is required.";
    }

    if (!formData.password) {
      newErrors.password = "Password is required.";
    } else if (formData.password.length < 12) {
      newErrors.password = "Password must contain at least 12 characters.";
    }

    if (!formData.terms) {
      newErrors.terms = "You must accept the terms to continue.";
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      /*
       * Backend currently expects:
       * email
       * full_name
       * password
       */

      const payload = {
        email: formData.email.trim(),
        full_name: `${formData.firstName.trim()} ${formData.lastName.trim()}`,
        organization: formData.organization.trim(),
        workflow_domain: formData.workflowDomain,
        role: formData.role,
        password: formData.password,
      };

      const response = await fetch(
        "http://127.0.0.1:8000/api/v1/auth/register",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Registration failed.");
      }

      // Show the success modal (redirects to login when the user clicks OK)
      setRegisteredUser({ name: payload.full_name, email: payload.email });

      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        organization: "",
        workflowDomain: "Finance & Accounting",
        role: "employee",
        password: "",
        terms: false,
      });
    } catch (error) {
      setErrors({
        email:
          error instanceof Error
            ? error.message
            : "Something went wrong. Please try again.",
      });
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

      <div className="relative mx-auto flex w-full max-w-7xl flex-col py-4">
        <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12 lg:gap-12">
          {/* ───────── Left column ───────── */}
          <div className="flex flex-col space-y-6 lg:col-span-6">
            {/* Eyebrow */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded bg-black text-white">
                <Icon name="account_tree" filled className="text-[20px]" />
              </span>

              <span
                className={`${mono} text-[11px] font-medium uppercase tracking-wider text-[#0058be]`}
              >
                DocuMind AI Enterprise
              </span>

              <span className="h-1.5 w-1.5 rounded-full bg-[#0058be]" />

              <span
                className={`${mono} text-[11px] font-medium text-[#45464d]`}
              >
                v4.18 Engine
              </span>
            </div>

            {/* Headline */}
            <div className="space-y-3">
              <h1 className="text-[2rem] font-bold leading-10 tracking-tight text-[#191c1e] sm:text-[3rem] sm:leading-14">
                Empower Your Teams with Autonomous Document Intelligence &amp;
                Instant Approvals.
              </h1>

              <p className="max-w-xl text-base leading-6.5 text-[#45464d]">
                Upload, analyze, review, and approve business documents with
                AI-powered workflows and role-based access control.
              </p>
            </div>

            {/* Pipeline trace */}
            <div className="relative overflow-hidden rounded-lg bg-white p-4 shadow-sm ring-1 ring-black/5">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-[#0058be]" />

                  <span
                    className={`${mono} text-[11px] font-medium uppercase text-[#191c1e]`}
                  >
                    Execution Pipeline Trace
                  </span>
                </div>

                <span
                  className={`${mono} text-[11px] font-medium text-[#76777d]`}
                >
                  LATENCY: 142ms
                </span>
              </div>

              <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                {/* Step 1 */}
                <div className="flex flex-col justify-between rounded bg-[#f2f4f6] p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`${mono} text-[11px] font-medium text-[#76777d]`}
                    >
                      01 / INGEST
                    </span>

                    <Icon
                      name="document_scanner"
                      className="text-[20px] text-[#0058be]"
                    />
                  </div>

                  <div className="mt-4">
                    <p className="text-base font-semibold tracking-[-0.01em] text-[#191c1e]">
                      Parse &amp; Vectorize
                    </p>

                    <div className="mt-1.5 flex items-center gap-1.5">
                      <span className="h-3 w-1 rounded-full bg-[#0058be]" />

                      <span
                        className={`${mono} text-[11px] font-medium text-[#45464d]`}
                      >
                        OCR Normalized
                      </span>
                    </div>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex flex-col justify-between rounded bg-[#f2f4f6] p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`${mono} text-[11px] font-medium text-[#76777d]`}
                    >
                      02 / VERIFY
                    </span>

                    <span
                      className={`${mono} rounded-sm bg-[#e0e3e5] px-1.5 py-0.5 text-[11px] font-semibold text-[#0058be]`}
                    >
                      99.4%
                    </span>
                  </div>

                  <div className="mt-4">
                    <p className="text-base font-semibold tracking-[-0.01em] text-[#191c1e]">
                      AI Extraction
                    </p>

                    <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-[#e0e3e5]">
                      <div className="h-full w-[99.4%] bg-[#0058be]" />
                    </div>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="flex flex-col justify-between rounded bg-black p-3 text-white">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`${mono} text-[11px] font-medium text-[#9aa1b8]`}
                    >
                      03 / DISPATCH
                    </span>

                    <Icon
                      name="verified"
                      filled
                      className="text-[20px] text-white"
                    />
                  </div>

                  <div className="mt-4">
                    <p className="text-base font-semibold tracking-[-0.01em] text-white">
                      Approval Routed
                    </p>

                    <span
                      className={`${mono} mt-1.5 block text-[11px] font-medium text-[#9aa1b8]`}
                    >
                      Audit Sealed • VPC
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Features */}
            <div className="space-y-5">
              <Feature
                icon="psychology"
                title="AI-Powered Analysis"
                description="Extract and understand important information from documents."
              />

              <Feature
                icon="rule_settings"
                title="Approval Workflows"
                description="Route documents to the right people for review and approval."
              />

              <Feature
                icon="encrypted"
                title="Role-Based Access"
                description="Control what employees, managers, and administrators can access."
              />
            </div>

            {/* Testimonial */}
            <figure className="relative flex flex-col space-y-4 overflow-hidden rounded-lg bg-white p-5 shadow-sm ring-1 ring-black/5">
              <Icon
                name="format_quote"
                className="absolute right-4 top-4 text-[48px] text-[#e0e3e5]"
              />

              <blockquote className="relative z-10 pr-8 text-base italic leading-6.5 text-[#191c1e]">
                &quot;DocuMind cut our document triage and invoice approval
                cycle from 4 business days to 18 seconds flat. Our auditing risk
                dropped to absolute zero.&quot;
              </blockquote>

              <figcaption className="relative z-10 flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  className="h-10 w-10 rounded-full bg-[#e0e3e5] object-cover"
                  alt="Portrait of Elena Rostova"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuA5po50rP2wi0s6u-c2FKFnU8WUyXL2essTwpUZDGAcxQ9qv8w5j-_hRR6Y33p_dzNARM7HyPonfEDm_pKseARubxdoEhADZwik_MMEjXEuyzQEovEuEfmc-goPt0D3NSg8eih3ewcdVo90xJ9H1DgaGC89wFcPtR1dJ3x1DqU06lINWjj2HlytZc6P7iCJO4uKB3Ztv0h7NaFxpkNnUM0UL6bt0FYVoMyM21VboZLd3sOJzd3v1n-Y"
                />

                <div>
                  <p className="text-base font-semibold tracking-[-0.01em] text-[#191c1e]">
                    Elena Rostova
                  </p>

                  <p
                    className={`${mono} text-[11px] font-medium text-[#45464d]`}
                  >
                    VP of Financial Operations, Apex Horizon Global
                  </p>
                </div>
              </figcaption>
            </figure>
          </div>

          {/* ───────── Right column ───────── */}
          <div className="w-full lg:col-span-6">
            <div className="flex flex-col space-y-5 rounded-lg bg-white p-5 shadow-xl ring-1 ring-black/5 sm:p-8">
              {/* Header */}
              <div className="space-y-2">
                <div className="inline-flex items-center gap-1 rounded-sm bg-[#d8e2ff] px-2.5 py-1 text-[#001a42]">
                  <Icon name="bolt" filled className="text-[14px]" />

                  <span
                    className={`${mono} text-[11px] font-medium uppercase tracking-wide`}
                  >
                    Enterprise Sandbox Active
                  </span>
                </div>

                <h2 className="text-[1.75rem] font-semibold leading-9 tracking-[-0.02em] text-[#191c1e] sm:text-[2rem] sm:leading-10">
                  Create your account
                </h2>

                <p className="text-sm leading-5 text-[#45464d]">
                  Set up your account to start managing documents.
                </p>
              </div>

              {/* SSO */}
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  className="flex items-center justify-center gap-2 rounded bg-[#f2f4f6] px-4 py-2.5 text-[#191c1e] transition-colors duration-150 hover:bg-[#eceef0] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0058be]"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.14z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.36 24 12 24z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.28 14.27a7.11 7.11 0 0 1 0-4.54V6.58H1.25a11.96 11.96 0 0 0 0 10.84l4.03-3.15z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.36 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                      fill="#EA4335"
                    />
                  </svg>

                  <span className="text-sm font-semibold">
                    Google Workspace
                  </span>
                </button>

                <button
                  type="button"
                  className="flex items-center justify-center gap-2 rounded bg-[#f2f4f6] px-4 py-2.5 text-[#191c1e] transition-colors duration-150 hover:bg-[#eceef0] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0058be]"
                >
                  <svg className="h-4 w-4" viewBox="0 0 23 23" aria-hidden="true">
                    <path d="M1 1h10v10H1z" fill="#F35325" />
                    <path d="M12 1h10v10H12z" fill="#81BC06" />
                    <path d="M1 12h10v10H1z" fill="#05A6F0" />
                    <path d="M12 12h10v10H12z" fill="#FFBA08" />
                  </svg>

                  <span className="text-sm font-semibold">
                    Microsoft Entra ID
                  </span>
                </button>
              </div>

              {/* Separator */}
              <div className="relative flex items-center justify-center">
                <div className="h-px w-full bg-[#e0e3e5]" />

                <span
                  className={`${mono} absolute bg-white px-3 text-[11px] font-medium uppercase text-[#76777d]`}
                >
                  or corporate credentials
                </span>
              </div>

              {/* Registration form */}
              <form onSubmit={handleSubmit} noValidate className="space-y-4">
                {/* Name */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <InputField
                    id="first-name"
                    name="firstName"
                    label="First Name"
                    placeholder="Alexander"
                    value={formData.firstName}
                    onChange={handleChange}
                    error={errors.firstName}
                    required
                  />

                  <InputField
                    id="last-name"
                    name="lastName"
                    label="Last Name"
                    placeholder="Vance"
                    value={formData.lastName}
                    onChange={handleChange}
                    error={errors.lastName}
                    required
                  />
                </div>

                {/* Email + Organization */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <InputField
                    id="work-email"
                    name="email"
                    label="Work Email"
                    type="email"
                    placeholder="you@company.com"
                    value={formData.email}
                    onChange={handleChange}
                    error={errors.email}
                    required
                  />

                  <InputField
                    id="organization"
                    name="organization"
                    label="Organization"
                    placeholder="Company name"
                    value={formData.organization}
                    onChange={handleChange}
                    error={errors.organization}
                    required
                  />
                </div>

                {/* Workflow + RBAC */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <SelectField
                    name="workflowDomain"
                    label="Workflow Domain"
                    value={formData.workflowDomain}
                    onChange={handleChange}
                    options={[
                      "Finance & Accounting",
                      "Legal & Compliance",
                      "Global Operations",
                      "Engineering / IT",
                    ]}
                  />

                  <SelectField
                    name="role"
                    label="Account Role"
                    value={formData.role}
                    onChange={handleChange}
                    options={[
                      { label: "Employee", value: "employee" },
                      { label: "Manager", value: "manager" },
                    ]}
                  />
                </div>

                {/* Password */}
                <div className="flex flex-col space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <label
                      htmlFor="reg-password"
                      className={`${mono} text-[11px] font-medium text-[#191c1e]`}
                    >
                      Password
                    </label>

                    <span
                      className={`${mono} text-[11px] font-medium transition-colors ${strengthColor}`}
                    >
                      {strengthLabel}
                    </span>
                  </div>

                  <div className="relative">
                    <input
                      id="reg-password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="Create a strong password"
                      required
                      autoComplete="new-password"
                      aria-invalid={!!errors.password}
                      aria-describedby={
                        errors.password ? "reg-password-error" : undefined
                      }
                      className={`${fieldClass(errors.password)} pr-11`}
                    />

                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                      className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded text-[#76777d] transition-colors hover:text-[#191c1e] focus-visible:outline-2 focus-visible:outline-[#0058be]"
                    >
                      <Icon
                        name={showPassword ? "visibility_off" : "visibility"}
                        className="text-[20px]"
                      />
                    </button>
                  </div>

                  <div className="grid grid-cols-4 gap-1.5 pt-0.5">
                    {[0, 1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className={`h-1 rounded-full transition-colors duration-200 ${barColor(i)}`}
                      />
                    ))}
                  </div>

                  <FieldError
                    id="reg-password-error"
                    message={errors.password}
                  />
                </div>

                {/* Terms */}
                <div className="space-y-1">
                  <label className="flex cursor-pointer items-start gap-2.5 pt-1 text-xs leading-4.5 text-[#45464d]">
                    <input
                      type="checkbox"
                      name="terms"
                      checked={formData.terms}
                      onChange={handleTermsChange}
                      className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded-sm accent-[#0058be] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0058be]"
                    />

                    <span>
                      I agree to the{" "}
                      <a
                        href="#"
                        className="font-medium text-[#0058be] underline underline-offset-2 hover:text-[#004395]"
                      >
                        Terms of Service
                      </a>{" "}
                      and{" "}
                      <a
                        href="#"
                        className="font-medium text-[#0058be] underline underline-offset-2 hover:text-[#004395]"
                      >
                        Privacy Policy
                      </a>
                      .
                    </span>
                  </label>

                  <FieldError message={errors.terms} />
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex w-full items-center justify-center gap-1.5 rounded bg-black px-4 py-3 text-base font-semibold text-white shadow-md transition hover:bg-[#2d3133] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0058be] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span>
                    {isSubmitting ? "Creating Account..." : "Create Account"}
                  </span>

                  {!isSubmitting && (
                    <Icon name="arrow_forward" className="text-[20px]" />
                  )}
                </button>
              </form>

              {/* Sign in */}
              <p className="text-center text-sm text-[#45464d]">
                Already have an account?
                <a
                  href="/login"
                  className="ml-1 font-semibold text-[#0058be] transition-colors hover:text-[#004395]"
                >
                  Sign in
                </a>
              </p>

              {/* Trust badges */}
              <div className="flex flex-wrap items-center justify-around gap-x-4 gap-y-2 rounded bg-[#f2f4f6] p-3 text-[#45464d]">
                <Badge icon="lock" label="256-Bit AES & TLS 1.3" />

                <Badge icon="verified_user" label="SOC-2 Type II Certified" />

                <Badge icon="cloud_done" label="AWS GovCloud & VPC Ready" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {registeredUser && (
        <SuccessModal
          name={registeredUser.name}
          email={registeredUser.email}
          onConfirm={() => router.push(LOGIN_PATH)}
        />
      )}
    </main>
  );
}

function InputField({
  id,
  name,
  label,
  placeholder,
  type = "text",
  value,
  onChange,
  error,
  required = false,
}: {
  id: string;
  name: string;
  label: string;
  placeholder: string;
  type?: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  required?: boolean;
}) {
  return (
    <div className="flex flex-col space-y-1.5">
      <label
        htmlFor={id}
        className={`${mono} text-[11px] font-medium text-[#191c1e]`}
      >
        {label}
      </label>

      <input
        id={id}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        className={fieldClass(error)}
      />

      <FieldError id={`${id}-error`} message={error} />
    </div>
  );
}

function SelectField({
  name,
  label,
  options,
  value,
  onChange,
}: {
  name: string;
  label: string;
  options:
    | string[]
    | {
        label: string;
        value: string;
      }[];
  value: string;
  onChange: (e: ChangeEvent<HTMLSelectElement>) => void;
}) {
  return (
    <div className="flex flex-col space-y-1.5">
      <label
        htmlFor={name}
        className={`${mono} text-[11px] font-medium text-[#191c1e]`}
      >
        {label}
      </label>

      <div className="relative">
        <select
          id={name}
          name={name}
          value={value}
          onChange={onChange}
          className={`${fieldClass()} cursor-pointer appearance-none pr-9`}
        >
          {options.map((option) => {
            if (typeof option === "string") {
              return (
                <option key={option} value={option}>
                  {option}
                </option>
              );
            }

            return (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            );
          })}
        </select>

        <Icon
          name="expand_more"
          className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[20px] text-[#76777d]"
        />
      </div>
    </div>
  );
}

function Feature({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-[#f2f4f6] text-[#191c1e]">
        <Icon name={icon} className="text-[24px]" />
      </div>

      <div>
        <h3 className="text-base font-semibold tracking-[-0.01em] text-[#191c1e]">
          {title}
        </h3>

        <p className="mt-1 text-sm leading-5.5 text-[#45464d]">
          {description}
        </p>
      </div>
    </div>
  );
}

function Badge({ icon, label }: { icon: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <Icon name={icon} className="text-[20px] text-[#0058be]" />

      <span className={`${mono} text-[11px] font-medium`}>{label}</span>
    </div>
  );
}

function SuccessModal({
  name,
  email,
  onConfirm,
}: {
  name: string;
  email: string;
  onConfirm: () => void;
}) {
  const [visible, setVisible] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // Fade / scale in
    const frame = requestAnimationFrame(() => setVisible(true));

    buttonRef.current?.focus();

    // Lock page scroll while the modal is open
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onConfirm();
      }

      // Keep focus inside the modal (its only control is the OK button)
      if (e.key === "Tab") {
        e.preventDefault();
        buttonRef.current?.focus();
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onConfirm]);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-[#131b2e]/60 px-4 backdrop-blur-sm transition-opacity duration-300 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="register-success-title"
        aria-describedby="register-success-description"
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
            <span className="absolute inset-0 animate-ping rounded-full bg-[#0058be]/15 [animation-duration:2.4s]" />
            <span className="absolute inset-0 rounded-full bg-[#0058be]/10" />

            <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-black text-white shadow-lg">
              <Icon name="check_circle" className="text-[30px]" />
            </span>
          </div>

          {/* Premium chip */}
          <span
            className={`${mono} mt-5 inline-flex items-center gap-1 rounded-full bg-[#d8e2ff] px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-[#001a42]`}
          >
            <Icon name="verified" className="text-[14px]" />
            Premium Enterprise
          </span>

          <h2
            id="register-success-title"
            className="mt-3 text-[1.75rem] font-semibold leading-9 tracking-[-0.02em] text-[#191c1e]"
          >
            Registration Successful
          </h2>

          <p
            id="register-success-description"
            className="mt-2 text-sm leading-5.5 text-[#45464d]"
          >
            Welcome,{" "}
            <span className="wrap-break-words font-semibold text-[#191c1e]">
              {name}
            </span>
            . You have been successfully registered.
          </p>

          {/* Account summary */}
          <div className="mt-5 flex w-full items-center gap-3 rounded bg-[#f2f4f6] px-3 py-2.5 text-left">
            <Icon name="verified_user" className="text-[20px] text-[#0058be]" />

            <div className="min-w-0">
              <p
                className={`${mono} text-[11px] font-medium uppercase text-[#76777d]`}
              >
                Account
              </p>

              <p className="truncate text-sm font-semibold text-[#191c1e]">
                {email}
              </p>
            </div>
          </div>

          {/* OK */}
          <button
            ref={buttonRef}
            type="button"
            onClick={onConfirm}
            className="mt-6 flex w-full items-center justify-center gap-1.5 rounded bg-black px-4 py-3 text-base font-semibold text-white shadow-md transition hover:bg-[#2d3133] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0058be] active:scale-[0.99]"
          >
            <span>OK</span>
            <Icon name="arrow_forward" className="text-[20px]" />
          </button>

          <p className="mt-3 text-xs text-[#76777d]">
            You&apos;ll be taken to the sign-in page.
          </p>
        </div>
      </div>
    </div>
  );
}