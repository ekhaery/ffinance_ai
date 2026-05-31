export const FAMILY_MEMBERS = ['Husband', 'Wife', 'Kid']

export const BALANCE_TYPES = {
  INCOME: 'income',
  TRANSFER_IN: 'transfer_in',
  TRANSFER_OUT: 'transfer_out',
  EXPENSE: 'expense',
} as const

export type BalanceType = typeof BALANCE_TYPES[keyof typeof BALANCE_TYPES]
