import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Shift } from '@/types'

interface ShiftState {
  currentShift: Shift | null
  isShiftOpen: boolean
  openShift: (shift: Shift) => void
  closeShift: () => void
}

export const useShiftStore = create<ShiftState>()(
  persist(
    (set) => ({
      currentShift: null,
      isShiftOpen: false,
      openShift: (shift) => set({ currentShift: shift, isShiftOpen: true }),
      closeShift: () => set({ currentShift: null, isShiftOpen: false }),
    }),
    { name: 'liyu-shift' }
  )
)