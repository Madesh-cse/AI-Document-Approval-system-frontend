export function getInitials(name: string) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return initials || "U";
}

export function formatRole(role: string) {
  return role
    .replace(/[_-]+/g, " ")
    .trim()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

export function getRoleBadgeClass(role: string) {
  switch (role.toLowerCase()) {
    case "admin":
      return "border-violet-200 bg-violet-50 text-violet-700";

    case "manager":
    case "approver":
      return "border-amber-200 bg-amber-50 text-amber-700";

    default:
      return "border-blue-200 bg-blue-50 text-blue-700";
  }
}