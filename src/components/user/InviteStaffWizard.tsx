// src/components/user/InviteStaffWizard.tsx
'use client'

import React, { useMemo, useState } from 'react'
import {
  Plus,
  Users,
  CheckCircle2,
  Copy,
  Share2,
  UserCog,
} from 'lucide-react'

import { createStaffInvitation } from '../../app/[locale]/(app)/actions/invitationActions'
import { toast } from '@/lib/utils/toast'
import type { StaffRole } from '@/types/enum'
import InviteActions from './InviteActions'
interface InviteWizardProps {
  locale: string
}

type GeneratedInvite = {
  name: string
  code: string
  inviteUrl: string
}

const ROLE_OPTIONS: {
  value: StaffRole
  label: string
  labelAm: string
  description: string
}[] = [
    {
      value: 'cashier',
      label: 'Cashier',
      labelAm: 'ገንዘብ ተቀባይ',
      description: 'Sales & payments',
    },
    {
      value: 'manager',
      label: 'Manager',
      labelAm: 'አስተዳዳሪ',
      description: 'Operations & staff',
    },
    {
      value: 'inventory_clerk',
      label: 'Stock Clerk',
      labelAm: 'ክምችት ኃላፊ',
      description: 'Inventory control',
    },
    {
      value: 'waiter',
      label: 'Waiter',
      labelAm: 'አስተናጋጅ',
      description: 'Restaurant service',
    },
    {
      value: 'barman',
      label: 'Barman',
      labelAm: 'ባርማን',
      description: 'Bar operations',
    },
    {
      value: 'kitchen',
      labelAm: 'ወጥ ቤት',
      label: 'Kitchen',
      description: 'Kitchen operations',
    },
  ]

export default function InviteStaffWizard({
  locale,
}: InviteWizardProps) {
  const isAm = locale === 'am'

  const [staffName, setStaffName] = useState('')
  const [phone, setPhone] = useState('')
  const [roleAssigned, setRoleAssigned] =
    useState<StaffRole>('cashier')

  const [isLoading, setIsLoading] = useState(false)

  const [generatedInvite, setGeneratedInvite] =
    useState<GeneratedInvite | null>(null)

  const t = (en: string, am: string) =>
    isAm ? am : en

  const selectedRole = useMemo(
    () =>
      ROLE_OPTIONS.find(
        (r) => r.value === roleAssigned
      ),
    [roleAssigned]
  )

  const validatePhone = (value: string) => {
    const cleaned = value.replace(/\s+/g, '')

    return (
      cleaned.startsWith('+251') ||
      cleaned.startsWith('09')
    )
  }

  const buildInviteMessage = (
    name: string,
    code: string,
    inviteUrl: string
  ) => {
    return isAm
      ? `👋 ሰላም ${name}

ወደ LIYU POS ተጋብዘዋል።

👤 ሚና: ${selectedRole?.labelAm ?? roleAssigned}

🔑 ኮድ: ${code}

🔗 ${inviteUrl}

እባክዎ ሊንኩን ተጠቅመው አካውንት ይፍጠሩ።`
      : `👋 Hi ${name}

You have been invited to LIYU POS.

👤 Role: ${selectedRole?.label ?? roleAssigned}

🔑 Code: ${code}

🔗 ${inviteUrl}

Please open the link and activate your account.`
  }

  const handleShare = async (
    message: string,
    inviteUrl: string,
    phoneNumber?: string
  ) => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'LIYU POS',
          text: message,
          url: inviteUrl,
        })

        return
      }

      if (phoneNumber) {
        const smsLink = `sms:${phoneNumber}?body=${encodeURIComponent(
          message
        )}`

        window.location.href = smsLink
        return
      }

      await navigator.clipboard.writeText(message)

      toast(
        t(
          'ግብዣው ወደ ክሊፕቦርድ ተቀድቷል',
          'Invitation copied to clipboard'
        ),
        'success'
      )
    } catch {
      // silent
    }
  }

  const handleRegisterAndShare = async (
    e: React.FormEvent
  ) => {
    e.preventDefault()

    const cleanName = staffName.trim()
    const cleanPhone = phone.trim()

    if (!cleanName) {
      toast(
        t(
          'እባክዎ ስም ያስገቡ',
          'Please enter staff name'
        ),
        'error'
      )
      return
    }

    if (!cleanPhone) {
      toast(
        t(
          'እባክዎ ስልክ ቁጥር ያስገቡ',
          'Please enter phone number'
        ),
        'error'
      )
      return
    }

    if (!validatePhone(cleanPhone)) {
      toast(
        t(
          'ትክክለኛ ስልክ ቁጥር ያስገቡ',
          'Please enter a valid phone number'
        ),
        'error'
      )
      return
    }

    setIsLoading(true)

    try {
      const result =
        await createStaffInvitation({
          staffName: cleanName,
          roleAssigned,
          phone: cleanPhone,
          locale,
        })

      if (!result?.success) {
        throw new Error(
          'Failed to create invitation'
        )
      }

      const inviteUrl =
        `${window.location.origin}/${locale}/invite?code=${result.code}`

      setGeneratedInvite({
        name: cleanName,
        code: result.code,
        inviteUrl,
      })

      const message = buildInviteMessage(
        cleanName,
        result.code,
        inviteUrl
      )

      setStaffName('')
      setPhone('')
      setRoleAssigned('cashier')

      toast(
        t(
          'ግብዣ ተፈጥሯል',
          'Invitation created successfully'
        ),
        'success'
      )

      await handleShare(
        message,
        inviteUrl,
        cleanPhone
      )
    } catch (error: any) {
      toast(
        error?.message ||
        t(
          'ስህተት ተፈጥሯል',
          'Something went wrong'
        ),
        'error'
      )
    } finally {
      setIsLoading(false)
    }
  }

  const copyCode = async () => {
    if (!generatedInvite) return

    await navigator.clipboard.writeText(
      generatedInvite.code
    )

    toast(
      t(
        'ኮዱ ተቀድቷል',
        'Code copied'
      ),
      'success'
    )
  }

  const copyLink = async () => {
    if (!generatedInvite) return

    await navigator.clipboard.writeText(
      generatedInvite.inviteUrl
    )

    toast(
      t(
        'ሊንኩ ተቀድቷል',
        'Link copied'
      ),
      'success'
    )
  }

  return (
    <div className="w-full rounded-2xl border border-cream-200 bg-white p-4 space-y-4 shadow-sm">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-berbere-50">
          <Users className="h-5 w-5 text-berbere-500" />
        </div>

        <div>
          <h3 className="font-black text-coffee-700">
            {t(
              'ሰራተኛ መጋበዣ',
              'Invite Staff'
            )}
          </h3>

          <p className="text-xs text-coffee-400">
            {t(
              'አዲስ ሰራተኛ ያክሉ',
              'Invite a new team member'
            )}
          </p>
        </div>
      </div>

      {/* Form */}
      <form
        onSubmit={handleRegisterAndShare}
        className="space-y-4"
      >
        <input
          value={staffName}
          onChange={(e) =>
            setStaffName(e.target.value)
          }
          placeholder={t(
            'ሙሉ ስም',
            'Full name'
          )}
          className="w-full rounded-xl border border-cream-200 bg-cream-50 px-3 py-3 text-sm outline-none focus:border-berbere-400"
          required
        />

        <input
          value={phone}
          onChange={(e) =>
            setPhone(e.target.value)
          }
          placeholder={t(
            'ስልክ ቁጥር (+251...)',
            'Phone number (+251...)'
          )}
          className="w-full rounded-xl border border-cream-200 bg-cream-50 px-3 py-3 text-sm outline-none focus:border-berbere-400"
          required
        />

        {/* Role Cards */}
        <div>
          <div className="mb-2 flex items-center gap-2">
            <UserCog className="h-4 w-4 text-coffee-500" />
            <span className="text-xs font-bold text-coffee-600">
              {t(
                'የሰራተኛ ሚና',
                'Staff Role'
              )}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {ROLE_OPTIONS.map((role) => (
              <button
                key={role.value}
                type="button"
                onClick={() =>
                  setRoleAssigned(role.value)
                }
                className={`rounded-xl border p-3 text-left transition-all ${roleAssigned === role.value
                  ? 'border-berbere-500 bg-berbere-50'
                  : 'border-cream-200 bg-white'
                  }`}
              >
                <div className="text-sm font-bold text-coffee-700">
                  {isAm
                    ? role.labelAm
                    : role.label}
                </div>

                <div className="mt-1 text-[11px] text-coffee-400">
                  {role.description}
                </div>
              </button>
            ))}
          </div>
        </div>

        <button
          disabled={isLoading}
          className="flex h-12 w-full items-center justify-center rounded-xl bg-berbere-500 font-black text-white disabled:opacity-60"
        >
          {isLoading ? (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          ) : (
            <>
              <Plus className="mr-2 h-4 w-4" />
              {t(
                'ግብዣ ላክ',
                'Send Invitation'
              )}
            </>
          )}
        </button>
      </form>

      {/* Success */}
      {generatedInvite && (
        <div className="rounded-2xl border border-green-200 bg-green-50 p-4">
          <div className="mb-3 flex items-center gap-2 text-green-700">
            <CheckCircle2 className="h-5 w-5" />
            <span className="font-bold">
              {t(
                'ግብዣ ተፈጥሯል',
                'Invitation Created'
              )}
            </span>
          </div>

          <div className="mb-3 text-sm text-coffee-700">
            {generatedInvite.name}
          </div>

          <div className="mb-3 flex items-center justify-between rounded-xl border bg-white p-3">
            <code className="font-black text-berbere-600">
              {generatedInvite.code}
            </code>

            <button
              type="button"
              onClick={copyCode}
            >
              <Copy className="h-4 w-4 text-coffee-500" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={copyLink}
              className="rounded-xl border border-cream-200 bg-white py-2 text-sm font-bold"
            >
              Copy Link
            </button>

            <button
              type="button"
              onClick={() => {
                const msg = buildInviteMessage(
                  generatedInvite.name,
                  generatedInvite.code,
                  generatedInvite.inviteUrl
                )

                handleShare(
                  msg,
                  generatedInvite.inviteUrl
                )
              }}
              className="flex items-center justify-center gap-2 rounded-xl bg-berbere-500 py-2 text-sm font-bold text-white"
            >
              <Share2 className="h-4 w-4" />
              Share
            </button>
          </div>
        </div>
      )}


      {generatedInvite && (
        <InviteActions
          generatedInvite={generatedInvite}
          phone={phone}
          locale={locale}
        />
      )}
    </div>
  )
}