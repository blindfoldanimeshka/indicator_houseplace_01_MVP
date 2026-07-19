// Данные профиля пользователя.
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ProfileData {}

// Подключённый внешний сервис.
export interface ConnectedService {
  id: string
  name: string
  status: 'connected' | 'not_connected'
}
