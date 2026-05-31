// Color palette — https://colorhunt.co/palette/3f9aae79c9c5ffe2aff96e5b
export const COLORS = {
  PRIMARY:    '#3F9AAE', // teal blue — buttons, active states, chips
  SECONDARY:  '#79C9C5', // light teal — hover states
  BACKGROUND: '#FFE2AF', // warm peach — reserved / accent
  NAVBAR:     '#F96E5B', // coral orange — navbar
} as const

export const FAMILY_MEMBERS = ['Husband', 'Wife', 'Kid']

export const BALANCE_TYPES = {
  INCOME: 'income',
  TRANSFER_IN: 'transfer_in',
  TRANSFER_OUT: 'transfer_out',
  EXPENSE: 'expense',
} as const

export type BalanceType = typeof BALANCE_TYPES[keyof typeof BALANCE_TYPES]
