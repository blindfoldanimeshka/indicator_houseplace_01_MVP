interface LegalViewProps {
  onBack: () => void
}

export function PrivacyPolicy({ onBack }: LegalViewProps) {
  return (
    <main className="min-h-screen bg-stone-50 px-5 py-12 sm:px-8">
      <div className="mx-auto max-w-3xl">
        <button
          type="button"
          onClick={onBack}
          className="mb-6 text-sm font-medium text-teal-800 hover:underline"
        >
          ← Назад
        </button>
        <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          Шаблон. Требует юридической проверки перед публичным запуском (152-ФЗ).
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-stone-950">
          Политика конфиденциальности
        </h1>
        <div className="mt-6 space-y-6 text-sm leading-7 text-stone-800">
          <section>
            <h2 className="text-lg font-semibold text-stone-950">
              1. Какие данные мы собираем
            </h2>
            <p>
              Мы собираем следующие персональные данные: адрес электронной почты,
              имя, город, тексты сообщений в чатах, а также фотографии объявлений,
              которые вы загружаете.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-stone-950">
              2. Цель обработки
            </h2>
            <p>
              Данные используются для регистрации аккаунта, публикации объявлений
              об аренде жилья, обмена сообщениями между пользователями и
              обеспечения работы сервиса.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-stone-950">
              3. Хранение данных
            </h2>
            <p>
              Данные хранятся на серверах обработчика (Supabase) в рамках срока
              действия вашего аккаунта и удаляются по вашему запросу или при
              удалении аккаунта.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-stone-950">
              4. Ваши права
            </h2>
            <p>
              Вы вправе запросить доступ к своим данным, их уточнение, удаление,
              а также отозвать согласие на обработку в любой момент, обратившись
              по контактам ниже.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-stone-950">5. Контакты</h2>
            <p>
              По вопросам обработки персональных данных пишите на адрес
              поддержки, указанный в сервисе.
            </p>
          </section>
        </div>
      </div>
    </main>
  )
}
