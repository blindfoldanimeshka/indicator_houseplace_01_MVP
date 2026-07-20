import type { NavEntry, NavParams, View } from './types'

export interface StackState {
  entries: NavEntry[]
  index: number
}

let keyCounter = 0
function makeKey(): string {
  keyCounter += 1
  return `nav-${keyCounter}`
}

export function newEntry(view: View, params: NavParams = {}): NavEntry {
  return { key: makeKey(), view, params, scrollY: 0, state: {} }
}

export function initialStack(view: View = 'home'): StackState {
  return { entries: [newEntry(view)], index: 0 }
}

export type StackAction =
  | { type: 'push'; view: View; params?: NavParams }
  | { type: 'replace'; view: View; params?: NavParams }
  | { type: 'back' }
  | { type: 'forward' }
  | { type: 'reset'; view?: View }

export function reduceStack(state: StackState, action: StackAction): StackState {
  switch (action.type) {
    case 'push': {
      const trimmed = state.entries.slice(0, state.index + 1)
      return { entries: [...trimmed, newEntry(action.view, action.params)], index: trimmed.length }
    }
    case 'replace': {
      const entries = state.entries.slice()
      const current = entries[state.index]
      entries[state.index] = {
        ...current,
        view: action.view,
        params: action.params ?? {},
      }
      return { entries, index: state.index }
    }
    case 'back':
      return { ...state, index: Math.max(0, state.index - 1) }
    case 'forward':
      return { ...state, index: Math.min(state.entries.length - 1, state.index + 1) }
    case 'reset':
      return initialStack(action.view ?? 'home')
  }
}
