# API-контракт CampusCard

Базовый URL (разработка): `http://localhost:8000`. Все пути начинаются с `/api`.
Формат — JSON. Аутентификация — httpOnly-куки `campuscard_session` (JWT),
устанавливается эндпоинтами `/api/auth/*`. CORS: только `FRONTEND_ORIGIN`
из настроек, `allow_credentials=True`.

Коды ошибок: 400 — валидация, 401 — не авторизован, 403 — запрещено,
404 — не найдено, 409 — конфликт (занятый slug), 502 — ошибка внешнего сервиса VK ID.
Тело ошибки: `{ "detail": "текст на русском" }`.

---

## Сервисные

### GET /api/health
Без авторизации. Ответ 200:
```json
{ "status": "ok" }
```

---

## Авторизация

### POST /api/auth/dev
Вход для разработки. Работает только при `DEV_AUTH=true`, иначе 403.
Тело: не требуется. Создаёт/находит единственного dev-пользователя
(`vk_id = NULL`, display_name «Демо-пользователь»; условный логин
`demo@campuscard.local`, email в БД не хранится).
Ответ 200 — профиль (см. UserOut ниже). Устанавливает куку `campuscard_session`
(httpOnly, samesite=lax, secure = настройка `COOKIE_SECURE`, срок —
JWT_EXPIRE_DAYS из настроек).

### POST /api/auth/vkid
Обмен кода VK ID на сессию (OAuth 2.1 + PKCE, обмен на бэкенде).
Тело:
```json
{ "code": "строка из redirect", "code_verifier": "PKCE verifier (43–128 символов)", "device_id": "строка из SDK" }
```
Ответ 200 — UserOut + установка куки. 502 — если обмен в VK ID не удался.
`state` на бэкенд не передаётся: его генерирует и проверяет @vkid/sdk
на фронтенде.

Взаимодействие с VK ID (по официальной документации, справочник методов:
id.vk.com/about/business/go/docs/ru/vkid/latest/vk-id/connection/api-description):
1. Обмен кода: `POST https://id.vk.ru/oauth2/auth`, тело
   `application/x-www-form-urlencoded`: `grant_type=authorization_code`,
   `code`, `code_verifier`, `device_id`, `redirect_uri` (из `VK_REDIRECT_URI`),
   `client_id`. Для конфиденциального приложения дополнительно
   `service_token` (= `VK_CLIENT_SECRET` из `.env`; отдельного параметра
   `client_secret` в API VK ID нет). Ответ: `access_token`, `refresh_token`,
   `id_token`, `expires_in`, `user_id`. Код живёт 10 минут.
2. Профиль: `POST https://id.vk.ru/oauth2/user_info`, тело form-urlencoded:
   `access_token`, `client_id`. Ответ: `{ "user": { "user_id", "first_name",
   "last_name", "avatar", ... } }`.
3. Ошибки обоих эндпоинтов: `{ "error", "error_description" }` → бэкенд
   отвечает 502 «Ошибка авторизации VK ID» (детали — в лог бэкенда,
   клиенту внутренние тексты внешнего сервиса не раскрываются).

### POST /api/auth/logout
Авторизация: да. Удаляет куку. Ответ 200: `{ "ok": true }`.

### GET /api/auth/me
Авторизация: да. Ответ 200:
```json
{
  "user": {
    "id": 1,
    "display_name": "Даниил Дёмкин",
    "avatar_url": "https://... или null",
    "is_vk": true
  },
  "card": null
}
```
`card` — CardOut (см. ниже) или `null`, если визитка не создана.

---

## Визитка владельца (авторизация: да)

### Объект CardIn (вход, PUT /api/cards/me)
```json
{
  "slug": "daniil-demkin",
  "full_name": "Даниил Дёмкин",
  "university": "МГУ",
  "specialty": "Прикладная математика",
  "graduation_year": 2027,
  "about": "текст до 1000 символов",
  "skills": ["Python", "React"],
  "links": [{ "type": "telegram", "label": "@daniil", "url": "https://t.me/daniil" }],
  "theme": "default"
}
```
Валидация (совпадает с frontend):
- `slug`: `^[a-z0-9-]{3,40}$`, не из списка зарезервированных
  (admin, api, login, u, app, edit, auth), уникален → иначе 409.
- `full_name`: 1–128, обязательное. `university`, `specialty`: ≤ 256.
- `graduation_year`: целое 2020–2035 или null.
- `about`: ≤ 1000. `skills`: ≤ 15 строк по ≤ 40 символов.
- `links`: ≤ 10 объектов; `type` ∈ {vk, telegram, email, phone, github, site};
  `url` — схема https://, http://, mailto: или tel:.
- `theme` ∈ {default, ocean, sunset, graphite}.

### Объект CardOut (выход)
Все поля CardIn + `id`, `is_published`, `views_count`, `public_url`
(относительный путь `/u/<slug>`), `created_at`, `updated_at`.

### GET /api/cards/me → 200 CardOut | 404 (визитки нет)
### PUT /api/cards/me → 200 CardOut
Создание (upsert). Если у пользователя уже есть визитка — обновление;
при смене slug проверяется уникальность (409 при конфликте).
### POST /api/cards/me/publish → 200 `{ "is_published": true|false }`
Переключает публикацию. 404, если визитки нет.
### DELETE /api/cards/me → 200 `{ "ok": true }` | 404

### GET /api/slug/check?slug=<строка>
Авторизация: да. Ответ 200:
```json
{ "slug": "daniil-demkin", "available": true, "reason": null }
```
`reason`: `"invalid" | "reserved" | "taken" | null`. Свой собственный текущий
slug считается доступным (`available: true`).

### GET /api/slug/generate?full_name=<строка>
Авторизация: да. Генерирует свободный slug из ФИО: транслитерация кириллицы,
нижний регистр, конфликты решаются суффиксом `-2`, `-3`, ...
Ответ 200:
```json
{ "slug": "daniil-demkin" }
```

---

## Публичный доступ (без авторизации)

### GET /api/u/{slug}
Ответ 200 — **только эти поля** (whitelist, никаких user_id/email):
```json
{
  "slug": "daniil-demkin",
  "full_name": "Даниил Дёмкин",
  "university": "МГУ",
  "specialty": "Прикладная математика",
  "graduation_year": 2027,
  "about": "...",
  "skills": ["Python", "React"],
  "links": [{ "type": "telegram", "label": "@daniil", "url": "https://t.me/daniil" }],
  "theme": "default",
  "avatar_url": "https://... или null"
}
```
404 — визитки нет ИЛИ `is_published=false` (без различения, чтобы не раскрывать
существование). При успешном ответе `views_count` увеличивается на 1.
