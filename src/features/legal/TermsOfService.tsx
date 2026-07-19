interface LegalViewProps {
  onBack: () => void
}

export function TermsOfService({ onBack }: LegalViewProps) {
  return (
    <main className="min-h-screen bg-background px-5 py-12 sm:px-8">
      <div className="mx-auto max-w-3xl">
        <button
          type="button"
          onClick={onBack}
          className="mb-6 text-sm font-medium text-primary hover:underline"
        >
          ← Назад
        </button>
        <p className="mb-4 rounded-xl border border-amber/30 bg-amber/10 px-4 py-3 text-sm text-amber-950">
          Шаблон. Требует юридической проверки перед публичным запуском (152-ФЗ).
        </p>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
          Условия использования
        </h1>
        <div className="mt-6 space-y-6 text-sm leading-7 text-muted-foreground">
          <section>
            <h2 className="font-display text-lg font-semibold text-foreground">
              1. Принятие условий
            </h2>
            <p>
              Используя сервис, вы подтверждаете, что ознакомились и согласны с
              настоящими условиями использования.
            </p>
          </section>
          <section>
            <h2 className="font-display text-lg font-semibold text-foreground">
              2. Характер сервиса
            </h2>
            <p>
              Сервис «СКВОТ» предназначен для прямой аренды жилья между пользователями
              без посредников. Мы не являемся стороной договора аренды.
            </p>
          </section>
          <section>
            <h2 className="font-display text-lg font-semibold text-foreground">
              3. Обязанности пользователя
            </h2>
            <p>
              Вы обязуетесь указывать достоверную информацию, не нарушать права
              третьих лиц и не использовать сервис в противоправных целях.
            </p>
          </section>
          <section>
            <h2 className="font-display text-lg font-semibold text-foreground">
              4. Ответственность
            </h2>
            <p>
              Сервис предоставляется «как есть». Мы не несём ответственности за
              действия пользователей и содержание объявлений.
            </p>
          </section>
          <section>
            <h2 className="font-display text-lg font-semibold text-foreground">
              5. Изменение условий
            </h2>
            <p>
              Мы можем обновлять условия; продолжение использования сервиса
              означает согласие с обновлённой версией.
            </p>
          </section>
        </div>
      </div>
    </main>
  )
}
