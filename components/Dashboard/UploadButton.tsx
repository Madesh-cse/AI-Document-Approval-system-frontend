"use client";

import { useRouter } from "next/navigation";

import { Icon } from "./Icon";

interface UploadButtonProps {
  className?: string;
}

export default function UploadButton({
  className = "",
}: UploadButtonProps) {
  const router = useRouter();

  const handleUploadClick = () => {
    router.push("/documents/upload");
  };

  return (
    <button
      type="button"
      onClick={handleUploadClick}
      className={`inline-flex items-center justify-center gap-2 rounded-lg bg-[#2563eb] px-4 py-2 text-sm font-medium text-white shadow-sm transition duration-150 hover:bg-[#1d4ed8] active:bg-[#1e40af] focus:outline-none focus:ring-2 focus:ring-[#3b82f6] focus:ring-offset-2 ${className}`}
    >
      <Icon
        name="upload"
        className="h-4 w-4"
      />

      <span>Upload Document</span>
    </button>
  );
}