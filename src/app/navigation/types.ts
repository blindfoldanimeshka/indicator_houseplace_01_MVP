export type View =
  | 'home' | 'new' | 'mine' | 'detail' | 'profile'
  | 'chats' | 'thread' | 'privacy' | 'terms'

export interface NavParams {
  listingId?: string
  chatId?: string
}

export interface NavEntry {
  key: string
  view: View
  params: NavParams
  scrollY: number
  state: Record<string, unknown>
}
