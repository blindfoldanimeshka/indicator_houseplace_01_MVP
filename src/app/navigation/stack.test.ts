import { describe, expect, it } from 'vitest'
import { initialStack, reduceStack, type StackState } from './stack'
import type { NavParams } from './types'

describe('reduceStack', () => {
  it('initializes with a single home entry', () => {
    const s = initialStack('home')
    expect(s.entries).toHaveLength(1)
    expect(s.index).toBe(0)
    expect(s.entries[0].view).toBe('home')
    expect(s.entries[0].scrollY).toBe(0)
    expect(s.entries[0].state).toEqual({})
  })
  it('push appends and moves index forward', () => {
    let s: StackState = initialStack('home')
    s = reduceStack(s, { type: 'push', view: 'detail', params: { listingId: 'x' } })
    expect(s.entries).toHaveLength(2)
    expect(s.index).toBe(1)
    expect(s.entries[1].view).toBe('detail')
    expect(s.entries[1].params).toEqual({ listingId: 'x' })
  })
  it('push truncates any forward history', () => {
    let s = initialStack('home')
    s = reduceStack(s, { type: 'push', view: 'detail' })
    s = reduceStack(s, { type: 'back' })
    s = reduceStack(s, { type: 'push', view: 'profile' })
    expect(s.entries).toHaveLength(2)
    expect(s.index).toBe(1)
    expect(s.entries[1].view).toBe('profile')
  })
  it('back and forward move the index without losing entries', () => {
    let s = initialStack('home')
    s = reduceStack(s, { type: 'push', view: 'detail' })
    s = reduceStack(s, { type: 'back' })
    expect(s.index).toBe(0)
    s = reduceStack(s, { type: 'forward' })
    expect(s.index).toBe(1)
    expect(s.entries).toHaveLength(2)
  })
  it('back never goes below zero', () => {
    const s = reduceStack(initialStack('home'), { type: 'back' })
    expect(s.index).toBe(0)
  })
  it('replace swaps the current entry in place', () => {
    let s = initialStack('home')
    s = reduceStack(s, { type: 'replace', view: 'terms' })
    expect(s.entries).toHaveLength(1)
    expect(s.entries[0].view).toBe('terms')
  })
  it('reset returns to a single entry', () => {
    let s = initialStack('home')
    s = reduceStack(s, { type: 'push', view: 'detail' })
    s = reduceStack(s, { type: 'reset', view: 'chats' })
    expect(s.entries).toHaveLength(1)
    expect(s.index).toBe(0)
    expect(s.entries[0].view).toBe('chats')
  })
  it('preserves entry key across replace', () => {
    let s = initialStack('home')
    const key = s.entries[0].key
    s = reduceStack(s, { type: 'replace', view: 'home' })
    expect(s.entries[0].key).toBe(key)
    expect(s.entries[0].state).toEqual({})
  })
  it('typed params allow listingId and chatId', () => {
    const p: NavParams = { listingId: 'a', chatId: 'b' }
    expect(p.listingId).toBe('a')
    expect(p.chatId).toBe('b')
  })
})
