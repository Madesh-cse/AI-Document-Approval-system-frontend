export type DateFormat = "dd-mmm-yyyy" | "dd/mm/yyyy" | "mm/dd/yyyy";
export type Density = "comfortable" | "compact";
export type DashboardRange = "7d" | "30d" | "90d";
export type AnswerStyle = "concise" | "detailed";

export interface AppSettings {
  // General
  timeZone: string; // "auto" or an IANA name such as "Asia/Kolkata"
  dateFormat: DateFormat;
  density: Density;
  dashboardRange: DashboardRange;
  rowsPerPage: 10 | 25 | 50;

  // Notifications
  channelEmail: boolean;
  channelInApp: boolean;
  notifyDecisions: boolean;
  notifyReviewRequests: boolean;
  notifyReminders: boolean;
  reminderLeadDays: 1 | 2 | 3;
  notifyDigest: boolean;

  // AI and documents
  autoExtract: boolean;
  showAiConfidence: boolean;
  showChatSources: boolean;
  answerStyle: AnswerStyle;
}

export const DEFAULT_SETTINGS: AppSettings = {
  timeZone: "auto",
  dateFormat: "dd-mmm-yyyy",
  density: "comfortable",
  dashboardRange: "30d",
  rowsPerPage: 10,

  channelEmail: true,
  channelInApp: true,
  notifyDecisions: true,
  notifyReviewRequests: true,
  notifyReminders: true,
  reminderLeadDays: 1,
  notifyDigest: false,

  autoExtract: true,
  showAiConfidence: true,
  showChatSources: true,
  answerStyle: "concise",
};

export const settingsKey = (userKey: string) => `app-settings:${userKey}`;

export function loadSettings(userKey: string): AppSettings {
  try {
    const raw = localStorage.getItem(settingsKey(userKey));

    if (!raw) return { ...DEFAULT_SETTINGS };

    const parsed = JSON.parse(raw) as Partial<AppSettings>;

    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(userKey: string, settings: AppSettings) {
  try {
    localStorage.setItem(settingsKey(userKey), JSON.stringify(settings));
    return true;
  } catch {
    return false;
  }
}