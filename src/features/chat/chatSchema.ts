import { z } from 'zod'

export const MAX_MESSAGE_LENGTH = 2000

export const messageSchema = z.object({
  text: z
    .string()
    .trim()
    .min(1, { message: 'Сообщение не может быть пустым.' })
    .max(MAX_MESSAGE_LENGTH, {
      message: `Сообщение не длиннее ${MAX_MESSAGE_LENGTH} символов.`,
    }),
})

export type MessageValues = z.infer<typeof messageSchema>
