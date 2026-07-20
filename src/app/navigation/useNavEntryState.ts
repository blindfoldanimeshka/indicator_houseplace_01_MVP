import { useCallback } from 'react'
import { useNav } from './NavigationProvider'

export function useNavEntryState<T>(
  name: string,
  initial: T,
): [T, (value: T) => void] {
  const { current, updateEntry } = useNav()
  const value = (current.state[name] as T) ?? initial

  const setValue = useCallback(
    (value: T) => {
      updateEntry(current.key, {
        state: { ...current.state, [name]: value },
      })
    },
    [updateEntry, current],
  )

  return [value, setValue]
}
