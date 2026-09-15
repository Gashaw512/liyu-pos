import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { Route } from 'next'

import {
ArrowLeft,
CircleDollarSign,
Plus,
Receipt,
Trash2,
Wallet,
} from 'lucide-react'

import {
createClient,
} from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

interface PageProps {
params: Promise<{
locale: string
}>
}

const EXPENSE_CATEGORIES = [
'Rent',
'Utilities',
'Salary',
'Transport',
'Supplies',
'Maintenance',
'Marketing',
'Other',
]

const PAYMENT_METHODS = [
{
value: 'cash',
label: 'Cash',
},
{
value: 'telebirr',
label: 'Telebirr',
},
{
value: 'cbe_birr',
label: 'CBE Birr',
},
{
value: 'bank_transfer',
label: 'Bank Transfer',
},
{
value: 'other',
label: 'Other',
},
]

export default async function DashboardExpensesPage({
params,
}: PageProps) {
const { locale } = await params

const supabase =
await createClient()

const isAm =
locale === 'am'

const t = (
en: string,
am: string,
) => (isAm ? am : en)

// ============================================================
// 1. AUTHENTICATION
// ============================================================

const {
data: {
user,
},
} =
await supabase.auth.getUser()

if (!user) {
redirect(
`/${locale}/auth/login` as Route,
)
}

// ============================================================
// 2. PROFILE / BUSINESS CONTEXT
// ============================================================

const {
data: profile,
} =
await supabase
.from('profiles')
.select(`         id,
        role,
        business_id
      `)
.eq(
'id',
user.id,
)
.is(
'deleted_at',
null,
)
.maybeSingle()

if (!profile) {
redirect(
`/${locale}/onboarding` as Route,
)
}

const businessId =
profile.business_id ??
user.user_metadata?.business_id ??
user.app_metadata?.business_id

if (!businessId) {
redirect(
`/${locale}/onboarding` as Route,
)
}

const userRole =
profile.role ??
user.user_metadata?.role ??
'owner'

// ============================================================
// 3. AUTHORIZATION
// ============================================================

const isOwnerOrManager =
userRole === 'owner' ||
userRole === 'manager'

if (!isOwnerOrManager) {
redirect(
`/${locale}/dashboard` as Route,
)
}

// ============================================================
// 4. CURRENT DATE
// ============================================================

const now = new Date()

const today =
now.toISOString().slice(
0,
10,
)

// ============================================================
// 5. EXPENSES
// ============================================================

const {
data: expenses,
error: expensesError,
} =
await supabase
.from('expenses')
.select(`         id,
        category,
        description,
        amount,
        payment_method,
        expense_date,
        branch_id,
        shift_id,
        created_at
      `)
.eq(
'business_id',
businessId,
)
.is(
'deleted_at',
null,
)
.order(
'expense_date',
{
ascending: false,
},
)
.order(
'created_at',
{
ascending: false,
},
)
.limit(100)

if (expensesError) {
console.error(
'[EXPENSES PAGE] Failed to load expenses:',
expensesError,
)
}

const expenseList =
expenses ?? []

// ============================================================
// 6. TODAY EXPENSE TOTAL
// ============================================================

const todayExpenses =
expenseList
.filter(
expense =>
expense.expense_date === today,
)
.reduce(
(
total,
expense,
) =>
total +
Number(
expense.amount ?? 0,
),
0,
)

// ============================================================
// 7. TOTAL EXPENSES
// ============================================================

const totalExpenses =
expenseList.reduce(
(
total,
expense,
) =>
total +
Number(
expense.amount ?? 0,
),
0,
)

// ============================================================
// 8. FORMAT MONEY
// ============================================================

const formatMoney = (
value: number,
) =>
value.toLocaleString(
isAm
? 'am-ET'
: 'en-ET',
{
minimumFractionDigits: 2,
maximumFractionDigits: 2,
},
)

// ============================================================
// 9. ADD EXPENSE
// ============================================================

async function addExpense(
formData: FormData,
) {
'use server'

const supabase =
  await createClient()

const {
  data: {
    user,
  },
} =
  await supabase.auth.getUser()

if (!user) {
  redirect(
    `/${locale}/auth/login` as Route,
  )
}

// ----------------------------------------------------------
// Reload profile securely
// ----------------------------------------------------------

const {
  data: profile,
} =
  await supabase
    .from('profiles')
    .select(`
      id,
      role,
      business_id
    `)
    .eq(
      'id',
      user.id,
    )
    .is(
      'deleted_at',
      null,
    )
    .maybeSingle()

if (!profile) {
  redirect(
    `/${locale}/onboarding` as Route,
  )
}

const actionBusinessId =
  profile.business_id ??
  user.user_metadata?.business_id ??
  user.app_metadata?.business_id

if (!actionBusinessId) {
  redirect(
    `/${locale}/onboarding` as Route,
  )
}

const actionRole =
  profile.role ??
  user.user_metadata?.role ??
  'owner'

if (
  actionRole !== 'owner' &&
  actionRole !== 'manager'
) {
  redirect(
    `/${locale}/dashboard` as Route,
  )
}

// ----------------------------------------------------------
// FORM VALUES
// ----------------------------------------------------------

const category =
  String(
    formData.get(
      'category',
    ) ?? '',
  ).trim()

const description =
  String(
    formData.get(
      'description',
    ) ?? '',
  ).trim()

const amountRaw =
  String(
    formData.get(
      'amount',
    ) ?? '',
  ).trim()

const paymentMethod =
  String(
    formData.get(
      'payment_method',
    ) ?? 'cash',
  ).trim()

const expenseDate =
  String(
    formData.get(
      'expense_date',
    ) ?? '',
  ).trim()

const amount =
  Number(amountRaw)

// ----------------------------------------------------------
// VALIDATION
// ----------------------------------------------------------

if (!category) {
  return
}

if (
  !Number.isFinite(
    amount,
  ) ||
  amount <= 0
) {
  return
}

if (!expenseDate) {
  return
}

// ----------------------------------------------------------
// FIND ACTIVE SHIFT
//
// An expense may happen during an open shift.
// shift_id remains nullable according to your schema.
// ----------------------------------------------------------

const {
  data: activeShift,
} =
  await supabase
    .from('shifts')
    .select(`
      id,
      branch_id
    `)
    .eq(
      'business_id',
      actionBusinessId,
    )
    .eq(
      'status',
      'open',
    )
    .order(
      'opened_at',
      {
        ascending: false,
      },
    )
    .limit(1)
    .maybeSingle()

// ----------------------------------------------------------
// INSERT EXPENSE
// ----------------------------------------------------------

const {
  error: insertError,
} =
  await supabase
    .from('expenses')
    .insert({
      business_id:
        actionBusinessId,

      branch_id:
        activeShift?.branch_id ??
        null,

      recorded_by:
        user.id,

      shift_id:
        activeShift?.id ??
        null,

      category,

      description:
        description ||
        null,

      amount,

      payment_method:
        paymentMethod ||
        'cash',

      expense_date:
        expenseDate,
    })

if (insertError) {
  console.error(
    '[EXPENSES PAGE] Failed to create expense:',
    insertError,
  )

  return
}

// ----------------------------------------------------------
// REFRESH EXPENSE PAGE
// ----------------------------------------------------------

revalidatePath(
  `/${locale}/dashboard/expenses`,
)

// ----------------------------------------------------------
// IMPORTANT:
//
// Your dashboard uses getDashboardReport().
// Revalidate it so:
//
// Gross Profit - Expenses = Net Profit
//
// immediately reflects the newly saved expense.
// ----------------------------------------------------------

revalidatePath(
  `/${locale}/dashboard`,
)

}

// ============================================================
// 10. SOFT DELETE EXPENSE
// ============================================================

async function deleteExpense(
formData: FormData,
) {
'use server'

const expenseId =
  String(
    formData.get(
      'expense_id',
    ) ?? '',
  )

if (!expenseId) {
  return
}

const supabase =
  await createClient()

const {
  data: {
    user,
  },
} =
  await supabase.auth.getUser()

if (!user) {
  redirect(
    `/${locale}/auth/login` as Route,
  )
}

// ----------------------------------------------------------
// SECURITY CONTEXT
// ----------------------------------------------------------

const {
  data: profile,
} =
  await supabase
    .from('profiles')
    .select(`
      role,
      business_id
    `)
    .eq(
      'id',
      user.id,
    )
    .is(
      'deleted_at',
      null,
    )
    .maybeSingle()

if (!profile) {
  return
}

const actionBusinessId =
  profile.business_id ??
  user.user_metadata?.business_id ??
  user.app_metadata?.business_id

const actionRole =
  profile.role ??
  user.user_metadata?.role ??
  'owner'

if (
  !actionBusinessId ||
  (
    actionRole !== 'owner' &&
    actionRole !== 'manager'
  )
) {
  return
}

// ----------------------------------------------------------
// SOFT DELETE
//
// Never delete another business's expense.
// ----------------------------------------------------------

const {
  error: deleteError,
} =
  await supabase
    .from('expenses')
    .update({
      deleted_at:
        new Date().toISOString(),
    })
    .eq(
      'id',
      expenseId,
    )
    .eq(
      'business_id',
      actionBusinessId,
    )
    .is(
      'deleted_at',
      null,
    )

if (deleteError) {
  console.error(
    '[EXPENSES PAGE] Failed to delete expense:',
    deleteError,
  )

  return
}

revalidatePath(
  `/${locale}/dashboard/expenses`,
)

revalidatePath(
  `/${locale}/dashboard`,
)

}

// ============================================================
// 11. RENDER
// ============================================================

return ( <div
   className="
     mx-auto
     w-full
     max-w-6xl
     space-y-5
     px-2
     pb-8
   "
 >
{/* ======================================================
HEADER
====================================================== */}

  <section
    className="
      flex
      flex-col
      gap-4
      rounded-2xl
      border
      border-coffee-100
      bg-white
      p-5
      shadow-sm
      sm:flex-row
      sm:items-center
      sm:justify-between
    "
  >
    <div>
      <a
        href={`/${locale}/dashboard`}
        className="
          inline-flex
          items-center
          gap-1.5
          text-[11px]
          font-bold
          text-coffee-400
          transition
          hover:text-berbere-600
        "
      >
        <ArrowLeft
          className="
            h-3.5
            w-3.5
          "
        />

        {t(
          'Back to Dashboard',
          'ወደ ዳሽቦርድ ተመለስ',
        )}
      </a>

      <div
        className="
          mt-3
          flex
          items-center
          gap-3
        "
      >
        <div
          className="
            flex
            h-11
            w-11
            items-center
            justify-center
            rounded-xl
            bg-red-50
          "
        >
          <CircleDollarSign
            className="
              h-5
              w-5
              text-red-600
            "
          />
        </div>

        <div>
          <h1
            className="
              text-lg
              font-black
              text-coffee-900
            "
          >
            {t(
              'Expenses',
              'ወጪዎች',
            )}
          </h1>

          <p
            className="
              mt-0.5
              text-xs
              text-coffee-400
            "
          >
            {t(
              'Record and manage business expenses',
              'የንግድ ወጪዎችን ይመዝግቡ እና ያስተዳድሩ',
            )}
          </p>
        </div>
      </div>
    </div>
  </section>

  {/* ======================================================
      SUMMARY
     ====================================================== */}

  <section
    className="
      grid
      gap-3
      sm:grid-cols-3
    "
  >
    <div
      className="
        rounded-2xl
        border
        border-red-100
        bg-white
        p-4
        shadow-sm
      "
    >
      <p
        className="
          text-[10px]
          font-black
          uppercase
          tracking-[0.12em]
          text-red-500
        "
      >
        {t(
          "Today's Expenses",
          'የዛሬ ወጪ',
        )}
      </p>

      <p
        className="
          mt-2
          text-xl
          font-black
          text-red-700
        "
      >
        {formatMoney(
          todayExpenses,
        )}
      </p>

      <p
        className="
          text-[10px]
          font-medium
          text-red-400
        "
      >
        ETB
      </p>
    </div>

    <div
      className="
        rounded-2xl
        border
        border-coffee-100
        bg-white
        p-4
        shadow-sm
      "
    >
      <p
        className="
          text-[10px]
          font-black
          uppercase
          tracking-[0.12em]
          text-coffee-400
        "
      >
        {t(
          'Recorded Expenses',
          'የተመዘገቡ ወጪዎች',
        )}
      </p>

      <p
        className="
          mt-2
          text-xl
          font-black
          text-coffee-900
        "
      >
        {expenseList.length.toLocaleString(
          isAm
            ? 'am-ET'
            : 'en-ET',
        )}
      </p>

      <p
        className="
          text-[10px]
          font-medium
          text-coffee-400
        "
      >
        {t(
          'active records',
          'ገባሪ መዝገቦች',
        )}
      </p>
    </div>

    <div
      className="
        rounded-2xl
        border
        border-coffee-100
        bg-white
        p-4
        shadow-sm
      "
    >
      <p
        className="
          text-[10px]
          font-black
          uppercase
          tracking-[0.12em]
          text-coffee-400
        "
      >
        {t(
          'Listed Total',
          'ጠቅላላ ወጪ',
        )}
      </p>

      <p
        className="
          mt-2
          text-xl
          font-black
          text-coffee-900
        "
      >
        {formatMoney(
          totalExpenses,
        )}
      </p>

      <p
        className="
          text-[10px]
          font-medium
          text-coffee-400
        "
      >
        ETB
      </p>
    </div>
  </section>

  {/* ======================================================
      ADD EXPENSE
     ====================================================== */}

  <section
    className="
      rounded-2xl
      border
      border-coffee-100
      bg-white
      p-5
      shadow-sm
    "
  >
    <div
      className="
        flex
        items-center
        gap-3
      "
    >
      <div
        className="
          flex
          h-9
          w-9
          items-center
          justify-center
          rounded-xl
          bg-berbere-50
        "
      >
        <Plus
          className="
            h-4
            w-4
            text-berbere-600
          "
        />
      </div>

      <div>
        <h2
          className="
            text-sm
            font-black
            text-coffee-900
          "
        >
          {t(
            'Record Expense',
            'ወጪ መዝግብ',
          )}
        </h2>

        <p
          className="
            mt-0.5
            text-[10px]
            text-coffee-400
          "
        >
          {t(
            'This expense will reduce net profit',
            'ይህ ወጪ የተጣራ ትርፍን ይቀንሳል',
          )}
        </p>
      </div>
    </div>

    <form
      action={addExpense}
      className="
        mt-5
        grid
        gap-4
        md:grid-cols-2
        lg:grid-cols-4
      "
    >
      {/* CATEGORY */}

      <div>
        <label
          htmlFor="category"
          className="
            text-[10px]
            font-black
            uppercase
            tracking-[0.08em]
            text-coffee-500
          "
        >
          {t(
            'Category',
            'የወጪ አይነት',
          )}
        </label>

        <select
          id="category"
          name="category"
          required
          defaultValue=""
          className="
            mt-1.5
            w-full
            rounded-xl
            border
            border-coffee-200
            bg-white
            px-3
            py-2.5
            text-sm
            font-semibold
            text-coffee-900
            outline-none
            focus:border-berbere-400
          "
        >
          <option
            value=""
            disabled
          >
            {t(
              'Select category',
              'የወጪ አይነት ይምረጡ',
            )}
          </option>

          {EXPENSE_CATEGORIES.map(
            category => (
              <option
                key={category}
                value={category}
              >
                {category}
              </option>
            ),
          )}
        </select>
      </div>

      {/* AMOUNT */}

      <div>
        <label
          htmlFor="amount"
          className="
            text-[10px]
            font-black
            uppercase
            tracking-[0.08em]
            text-coffee-500
          "
        >
          {t(
            'Amount',
            'መጠን',
          )}
        </label>

        <div
          className="
            mt-1.5
            flex
            items-center
            overflow-hidden
            rounded-xl
            border
            border-coffee-200
            bg-white
            focus-within:border-berbere-400
          "
        >
          <input
            id="amount"
            name="amount"
            type="number"
            min="0.01"
            step="0.01"
            required
            placeholder="0.00"
            className="
              w-full
              bg-transparent
              px-3
              py-2.5
              text-sm
              font-bold
              text-coffee-900
              outline-none
            "
          />

          <span
            className="
              border-l
              border-coffee-100
              px-3
              text-[10px]
              font-black
              text-coffee-400
            "
          >
            ETB
          </span>
        </div>
      </div>

      {/* PAYMENT METHOD */}

      <div>
        <label
          htmlFor="payment_method"
          className="
            text-[10px]
            font-black
            uppercase
            tracking-[0.08em]
            text-coffee-500
          "
        >
          {t(
            'Payment Method',
            'የክፍያ ዘዴ',
          )}
        </label>

        <select
          id="payment_method"
          name="payment_method"
          defaultValue="cash"
          className="
            mt-1.5
            w-full
            rounded-xl
            border
            border-coffee-200
            bg-white
            px-3
            py-2.5
            text-sm
            font-semibold
            text-coffee-900
            outline-none
            focus:border-berbere-400
          "
        >
          {PAYMENT_METHODS.map(
            method => (
              <option
                key={method.value}
                value={method.value}
              >
                {method.label}
              </option>
            ),
          )}
        </select>
      </div>

      {/* DATE */}

      <div>
        <label
          htmlFor="expense_date"
          className="
            text-[10px]
            font-black
            uppercase
            tracking-[0.08em]
            text-coffee-500
          "
        >
          {t(
            'Expense Date',
            'የወጪ ቀን',
          )}
        </label>

        <input
          id="expense_date"
          name="expense_date"
          type="date"
          required
          defaultValue={today}
          className="
            mt-1.5
            w-full
            rounded-xl
            border
            border-coffee-200
            bg-white
            px-3
            py-2.5
            text-sm
            font-semibold
            text-coffee-900
            outline-none
            focus:border-berbere-400
          "
        />
      </div>

      {/* DESCRIPTION */}

      <div
        className="
          md:col-span-2
          lg:col-span-3
        "
      >
        <label
          htmlFor="description"
          className="
            text-[10px]
            font-black
            uppercase
            tracking-[0.08em]
            text-coffee-500
          "
        >
          {t(
            'Description',
            'ማብራሪያ',
          )}
        </label>

        <input
          id="description"
          name="description"
          type="text"
          maxLength={500}
          placeholder={
            isAm
              ? 'ለዚህ ወጪ አጭር ማብራሪያ ያስገቡ'
              : 'Add a short note about this expense'
          }
          className="
            mt-1.5
            w-full
            rounded-xl
            border
            border-coffee-200
            bg-white
            px-3
            py-2.5
            text-sm
            font-medium
            text-coffee-900
            outline-none
            placeholder:text-coffee-300
            focus:border-berbere-400
          "
        />
      </div>

      {/* SUBMIT */}

      <div
        className="
          flex
          items-end
        "
      >
        <button
          type="submit"
          className="
            flex
            w-full
            items-center
            justify-center
            gap-2
            rounded-xl
            bg-berbere-600
            px-4
            py-2.5
            text-sm
            font-black
            text-white
            transition
            hover:bg-berbere-700
            active:scale-[0.98]
          "
        >
          <Plus
            className="
              h-4
              w-4
            "
          />

          {t(
            'Record',
            'መዝግብ',
          )}
        </button>
      </div>
    </form>
  </section>

  {/* ======================================================
      EXPENSE HISTORY
     ====================================================== */}

  <section
    className="
      overflow-hidden
      rounded-2xl
      border
      border-coffee-100
      bg-white
      shadow-sm
    "
  >
    <div
      className="
        flex
        items-center
        gap-3
        border-b
        border-coffee-100
        px-5
        py-4
      "
    >
      <div
        className="
          flex
          h-9
          w-9
          items-center
          justify-center
          rounded-xl
          bg-coffee-50
        "
      >
        <Receipt
          className="
            h-4
            w-4
            text-coffee-700
          "
        />
      </div>

      <div>
        <h2
          className="
            text-sm
            font-black
            text-coffee-900
          "
        >
          {t(
            'Expense History',
            'የወጪ ታሪክ',
          )}
        </h2>

        <p
          className="
            mt-0.5
            text-[10px]
            text-coffee-400
          "
        >
          {t(
            'Recent business expenses',
            'የቅርብ ጊዜ የንግድ ወጪዎች',
          )}
        </p>
      </div>
    </div>

    {expenseList.length === 0 ? (
      <div
        className="
          flex
          flex-col
          items-center
          justify-center
          px-5
          py-12
          text-center
        "
      >
        <Wallet
          className="
            h-9
            w-9
            text-coffee-200
          "
        />

        <p
          className="
            mt-3
            text-sm
            font-black
            text-coffee-700
          "
        >
          {t(
            'No expenses recorded yet',
            'እስካሁን ምንም ወጪ አልተመዘገበም',
          )}
        </p>

        <p
          className="
            mt-1
            text-xs
            text-coffee-400
          "
        >
          {t(
            'Record your first business expense above',
            'የመጀመሪያውን የንግድ ወጪ ከላይ ይመዝግቡ',
          )}
        </p>
      </div>
    ) : (
      <div
        className="
          divide-y
          divide-coffee-100
        "
      >
        {expenseList.map(
          expense => {
            const amount =
              Number(
                expense.amount ?? 0,
              )

            return (
              <div
                key={expense.id}
                className="
                  flex
                  flex-col
                  gap-3
                  px-5
                  py-4
                  transition
                  hover:bg-coffee-50
                  sm:flex-row
                  sm:items-center
                  sm:justify-between
                "
              >
                <div
                  className="
                    flex
                    min-w-0
                    items-center
                    gap-3
                  "
                >
                  <div
                    className="
                      flex
                      h-9
                      w-9
                      shrink-0
                      items-center
                      justify-center
                      rounded-xl
                      bg-red-50
                    "
                  >
                    <CircleDollarSign
                      className="
                        h-4
                        w-4
                        text-red-600
                      "
                    />
                  </div>

                  <div
                    className="
                      min-w-0
                    "
                  >
                    <p
                      className="
                        truncate
                        text-sm
                        font-black
                        text-coffee-900
                      "
                    >
                      {expense.category}
                    </p>

                    <p
                      className="
                        mt-0.5
                        truncate
                        text-[11px]
                        text-coffee-400
                      "
                    >
                      {expense.description ||
                        t(
                          'No description',
                          'ማብራሪያ የለም',
                        )}
                    </p>

                    <p
                      className="
                        mt-1
                        text-[10px]
                        font-medium
                        text-coffee-400
                      "
                    >
                      {expense.expense_date}
                      {' · '}
                      {expense.payment_method ||
                        'cash'}
                    </p>
                  </div>
                </div>

                <div
                  className="
                    flex
                    items-center
                    justify-between
                    gap-4
                    sm:justify-end
                  "
                >
                  <p
                    className="
                      text-base
                      font-black
                      text-red-700
                    "
                  >
                    -
                    {formatMoney(
                      amount,
                    )}{' '}
                    ETB
                  </p>

                  <form
                    action={deleteExpense}
                  >
                    <input
                      type="hidden"
                      name="expense_id"
                      value={expense.id}
                    />

                    <button
                      type="submit"
                      title={t(
                        'Delete expense',
                        'ወጪ ሰርዝ',
                      )}
                      className="
                        flex
                        h-9
                        w-9
                        items-center
                        justify-center
                        rounded-xl
                        text-coffee-300
                        transition
                        hover:bg-red-50
                        hover:text-red-600
                      "
                    >
                      <Trash2
                        className="
                          h-4
                          w-4
                        "
                      />
                    </button>
                  </form>
                </div>
              </div>
            )
          },
        )}
      </div>
    )}
  </section>
</div>


)
}
