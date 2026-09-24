"use client";

import { useMemo, useState, type FormEvent } from "react";
import {
  CheckCircle2,
  ChevronDown,
  Copy,
  Link2,
  QrCode,
  RotateCcw,
  Share2,
  UserPlus,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

import { createStaffInvitation } from "@/app/[locale]/(app)/actions/invitationActions";
import { toast } from "@/lib/utils/toast";
import type { StaffRole } from "@/types/enum";

interface InviteStaffWizardProps {
  locale: string;
}

interface GeneratedInvite {
  name: string;
  phone: string;
  role: StaffRole;
  code: string;
  inviteUrl: string;
}

interface RoleOption {
  value: StaffRole;
  label: string;
  labelAm: string;
  description: string;
  descriptionAm: string;
}

const ROLE_OPTIONS: RoleOption[] = [
  {
    value: "cashier",
    label: "Cashier",
    labelAm: "ገንዘብ ተቀባይ",
    description: "Sales & payments",
    descriptionAm: "ሽያጭ እና ክፍያ",
  },
  {
    value: "manager",
    label: "Manager",
    labelAm: "አስተዳዳሪ",
    description: "Business operations",
    descriptionAm: "የንግድ አስተዳደር",
  },
  {
    value: "inventory_clerk",
    label: "Stock Clerk",
    labelAm: "የክምችት ኃላፊ",
    description: "Inventory",
    descriptionAm: "ክምችት",
  },
  {
    value: "waiter",
    label: "Waiter",
    labelAm: "አስተናጋጅ",
    description: "Customer orders",
    descriptionAm: "የደንበኛ ትዕዛዝ",
  },
  {
    value: "barman",
    label: "Barman",
    labelAm: "ባርማን",
    description: "Bar operations",
    descriptionAm: "የባር ስራ",
  },
  {
    value: "kitchen",
    label: "Kitchen",
    labelAm: "ወጥ ቤት",
    description: "Kitchen orders",
    descriptionAm: "የወጥ ቤት ስራ",
  },
];

export default function InviteStaffWizard({
  locale,
}: InviteStaffWizardProps) {
  const isAm = locale === "am";

  const [staffName, setStaffName] = useState("");
  const [phone, setPhone] = useState("");
  const [roleAssigned, setRoleAssigned] =
    useState<StaffRole>("cashier");

  const [isLoading, setIsLoading] = useState(false);
  const [generatedInvite, setGeneratedInvite] =
    useState<GeneratedInvite | null>(null);

  const t = (en: string, am: string) => (isAm ? am : en);

  const selectedRole = useMemo(
    () =>
      ROLE_OPTIONS.find(
        (role) => role.value === roleAssigned
      ),
    [roleAssigned]
  );

  const normalizePhone = (value: string) => {
    const cleaned = value.replace(/[^\d+]/g, "");

    if (cleaned.startsWith("09")) {
      return `+251${cleaned.slice(1)}`;
    }

    if (cleaned.startsWith("251")) {
      return `+${cleaned}`;
    }

    return cleaned;
  };

  const isValidPhone = (value: string) => {
    return /^\+2519\d{8}$/.test(normalizePhone(value));
  };

  const getRoleName = (role: StaffRole) => {
    const option = ROLE_OPTIONS.find(
      (item) => item.value === role
    );

    if (!option) return role;

    return isAm ? option.labelAm : option.label;
  };

  const buildInviteMessage = (invite: GeneratedInvite) => {
    const roleName = getRoleName(invite.role);

    return isAm
      ? `ሰላም ${invite.name},

ወደ LIYU POS ተጋብዘዋል።

ሚና: ${roleName}
የግብዣ ኮድ: ${invite.code}

${invite.inviteUrl}

እባክዎ ሊንኩን በመክፈት አካውንትዎን ያግብሩ።`
      : `Hi ${invite.name},

You have been invited to LIYU POS.

Role: ${roleName}
Invitation code: ${invite.code}

${invite.inviteUrl}

Please open the link to activate your account.`;
  };

  const shareInvitation = async () => {
    if (!generatedInvite) return;

    const message = buildInviteMessage(generatedInvite);

    try {
      if (navigator.share) {
        await navigator.share({
          title: t(
            "LIYU POS Staff Invitation",
            "የLIYU POS የሰራተኛ ግብዣ"
          ),
          text: message,
          url: generatedInvite.inviteUrl,
        });

        return;
      }

      await navigator.clipboard.writeText(message);

      toast(
        t(
          "ግብዣው ተቀድቷል",
          "Invitation copied to clipboard"
        ),
        "success"
      );
    } catch {
      // Sharing was cancelled or unavailable.
    }
  };

  const copyToClipboard = async (
    value: string,
    successMessage: string,
    errorMessage: string
  ) => {
    try {
      await navigator.clipboard.writeText(value);

      toast(successMessage, "success");
    } catch {
      toast(errorMessage, "error");
    }
  };

  const copyCode = () => {
    if (!generatedInvite) return;

    void copyToClipboard(
      generatedInvite.code,
      t("ኮዱ ተቀድቷል", "Code copied"),
      t(
        "ኮዱን መቅዳት አልተቻለም",
        "Could not copy the code"
      )
    );
  };

  const copyLink = () => {
    if (!generatedInvite) return;

    void copyToClipboard(
      generatedInvite.inviteUrl,
      t("ሊንኩ ተቀድቷል", "Link copied"),
      t(
        "ሊንኩን መቅዳት አልተቻለም",
        "Could not copy the link"
      )
    );
  };

  const resetInvitation = () => {
    setGeneratedInvite(null);
    setStaffName("");
    setPhone("");
    setRoleAssigned("cashier");
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    const cleanName = staffName.trim();
    const normalizedPhone = normalizePhone(phone);

    if (!cleanName) {
      toast(
        t(
          "እባክዎ ሙሉ ስም ያስገቡ",
          "Please enter the staff member's full name"
        ),
        "error"
      );
      return;
    }

    if (cleanName.length < 2) {
      toast(
        t(
          "እባክዎ ትክክለኛ ስም ያስገቡ",
          "Please enter a valid name"
        ),
        "error"
      );
      return;
    }

    if (!normalizedPhone) {
      toast(
        t(
          "እባክዎ ስልክ ቁጥር ያስገቡ",
          "Please enter a phone number"
        ),
        "error"
      );
      return;
    }

    if (!isValidPhone(normalizedPhone)) {
      toast(
        t(
          "ትክክለኛ የኢትዮጵያ ስልክ ቁጥር ያስገቡ",
          "Please enter a valid Ethiopian phone number"
        ),
        "error"
      );
      return;
    }

    setIsLoading(true);

    try {
      const result = await createStaffInvitation({
        staffName: cleanName,
        roleAssigned,
        phone: normalizedPhone,
        locale,
      });

      if (!result?.success || !result.code) {
        throw new Error(
          t(
            "ግብዣውን መፍጠር አልተቻለም",
            "Unable to create the invitation"
          )
        );
      }

      const inviteUrl =
        `${window.location.origin}/${locale}/invite?code=${result.code}`;

      setGeneratedInvite({
        name: cleanName,
        phone: normalizedPhone,
        role: roleAssigned,
        code: result.code,
        inviteUrl,
      });

      // Clear the form only after the invitation has been
      // successfully created.
      setStaffName("");
      setPhone("");
      setRoleAssigned("cashier");

      toast(
        t(
          "ግብዣው በተሳካ ሁኔታ ተፈጥሯል",
          "Invitation created successfully"
        ),
        "success"
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : t(
              "ስህተት ተፈጥሯል",
              "Something went wrong"
            );

      toast(message, "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {!generatedInvite ? (
        <form
          onSubmit={handleSubmit}
          className="space-y-4"
        >
          {/* Name + phone */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-bold text-coffee-600">
                {t("Full name", "ሙሉ ስም")}
              </label>

              <input
                value={staffName}
                onChange={(event) =>
                  setStaffName(event.target.value)
                }
                placeholder={t(
                  "Enter full name",
                  "ሙሉ ስም ያስገቡ"
                )}
                autoComplete="name"
                className="h-11 w-full rounded-xl border border-cream-300 bg-cream-50 px-3.5 text-sm text-coffee-700 outline-none transition placeholder:text-coffee-300 focus:border-berbere-400 focus:ring-2 focus:ring-berbere-50"
                required
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold text-coffee-600">
                {t("Phone number", "ስልክ ቁጥር")}
              </label>

              <input
                value={phone}
                onChange={(event) =>
                  setPhone(event.target.value)
                }
                placeholder="+251 911 234 567"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                className="h-11 w-full rounded-xl border border-cream-300 bg-cream-50 px-3.5 text-sm text-coffee-700 outline-none transition placeholder:text-coffee-300 focus:border-berbere-400 focus:ring-2 focus:ring-berbere-50"
                required
              />
            </div>
          </div>

          {/* Role */}
          <div>
            <label className="mb-1.5 block text-xs font-bold text-coffee-600">
              {t("Staff role", "የሰራተኛ ሚና")}
            </label>

            <div className="relative">
              <select
                value={roleAssigned}
                onChange={(event) =>
                  setRoleAssigned(
                    event.target.value as StaffRole
                  )
                }
                className="h-11 w-full appearance-none rounded-xl border border-cream-300 bg-cream-50 px-3.5 pr-10 text-sm font-semibold text-coffee-700 outline-none transition focus:border-berbere-400 focus:ring-2 focus:ring-berbere-50"
              >
                {ROLE_OPTIONS.map((role) => (
                  <option
                    key={role.value}
                    value={role.value}
                  >
                    {isAm ? role.labelAm : role.label}
                    {" — "}
                    {isAm
                      ? role.descriptionAm
                      : role.description}
                  </option>
                ))}
              </select>

              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-coffee-400" />
            </div>

            {selectedRole && (
              <p className="mt-1.5 text-[11px] text-coffee-400">
                {isAm
                  ? selectedRole.descriptionAm
                  : selectedRole.description}
              </p>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-berbere-500 px-4 text-sm font-bold text-white transition hover:bg-berbere-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : (
              <>
                <UserPlus className="h-4 w-4" />
                {t(
                  "Create Invitation",
                  "ግብዣ ፍጠር"
                )}
              </>
            )}
          </button>
        </form>
      ) : (
        /* Generated invitation */
        <section className="overflow-hidden rounded-2xl border border-gold-200 bg-gold-50">
          {/* Header */}
          <div className="flex items-center justify-between gap-3 border-b border-gold-200 px-4 py-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gold-100">
                <CheckCircle2 className="h-4.5 w-4.5 text-gold-600" />
              </div>

              <div className="min-w-0">
                <h3 className="text-sm font-bold text-coffee-700">
                  {t(
                    "Invitation ready",
                    "ግብዣው ዝግጁ ነው"
                  )}
                </h3>

                <p className="truncate text-[11px] text-coffee-500">
                  {generatedInvite.name} ·{" "}
                  {getRoleName(generatedInvite.role)}
                </p>
              </div>
            </div>

            <span className="shrink-0 rounded-full bg-gold-100 px-2 py-1 text-[10px] font-bold text-gold-700">
              {t("Pending", "በመጠባበቅ ላይ")}
            </span>
          </div>

          {/* QR + invitation details */}
          <div className="grid gap-4 p-4 sm:grid-cols-[132px_1fr] sm:items-center">
            {/* QR */}
            <div className="flex justify-center">
              <div className="rounded-2xl border border-cream-300 bg-white p-3 shadow-sm">
                <QRCodeSVG
                  value={generatedInvite.inviteUrl}
                  size={108}
                  level="M"
                  includeMargin={false}
                  bgColor="#ffffff"
                  fgColor="#2B1E1A"
                  title={t(
                    "Staff invitation QR code",
                    "የሰራተኛ ግብዣ QR ኮድ"
                  )}
                />

                <div className="mt-2 flex items-center justify-center gap-1 text-[9px] font-bold text-coffee-400">
                  <QrCode className="h-3 w-3" />
                  {t("Scan to activate", "ለማግበር ስካን ያድርጉ")}
                </div>
              </div>
            </div>

            {/* Code + link */}
            <div className="min-w-0 space-y-2.5">
              <div className="rounded-xl border border-cream-300 bg-white px-3 py-2.5">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-coffee-400">
                      {t(
                        "Invitation code",
                        "የግብዣ ኮድ"
                      )}
                    </p>

                    <code className="text-lg font-black tracking-[0.16em] text-berbere-600">
                      {generatedInvite.code}
                    </code>
                  </div>

                  <button
                    type="button"
                    onClick={copyCode}
                    className="shrink-0 rounded-lg p-2 text-coffee-500 transition hover:bg-cream-100 hover:text-coffee-700"
                    aria-label={t(
                      "Copy invitation code",
                      "የግብዣ ኮድ ቅዳ"
                    )}
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 rounded-xl border border-cream-300 bg-white px-3 py-2.5">
                <Link2 className="h-4 w-4 shrink-0 text-coffee-400" />

                <span className="min-w-0 flex-1 truncate text-[11px] text-coffee-500">
                  {generatedInvite.inviteUrl}
                </span>

                <button
                  type="button"
                  onClick={copyLink}
                  className="shrink-0 rounded-lg p-2 text-coffee-500 transition hover:bg-cream-100 hover:text-coffee-700"
                  aria-label={t(
                    "Copy invitation link",
                    "የግብዣ ሊንክ ቅዳ"
                  )}
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-2 border-t border-gold-200 bg-gold-50 px-4 py-3 sm:grid-cols-[1fr_1fr_auto]">
            <button
              type="button"
              onClick={shareInvitation}
              className="flex h-10 items-center justify-center gap-2 rounded-xl bg-berbere-500 px-3 text-xs font-bold text-white transition hover:bg-berbere-600 sm:col-span-2"
            >
              <Share2 className="h-4 w-4" />
              {t(
                "Share Invitation",
                "ግብዣውን አጋራ"
              )}
            </button>

            <button
              type="button"
              onClick={resetInvitation}
              className="flex h-10 items-center justify-center gap-2 rounded-xl border border-cream-300 bg-white px-3 text-xs font-bold text-coffee-600 transition hover:bg-cream-100"
            >
              <RotateCcw className="h-4 w-4" />
              {t(
                "Create another",
                "ሌላ ፍጠር"
              )}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}