# Схема базы данных CampusCard

SQLite (разработка). ORM — SQLAlchemy 2.x. Создание таблиц — через
`Base.metadata.create_all` при старте приложения (миграции не используем).

## Таблица `users`

| Поле | Тип | Ограничения | Описание |
|---|---|---|---|
| id | Integer | PK, autoincrement | |
| vk_id | String(32) | UNIQUE, NULL допускается | ID пользователя VK; NULL у dev-пользователя |
| display_name | String(128) | NOT NULL | Имя из VK ID или «Демо-пользователь» |
| avatar_url | String(512) | NULL | Аватар из VK ID |
| created_at | DateTime | NOT NULL, default now | |

## Таблица `cards`

Одна визитка на пользователя (`user_id` UNIQUE).

| Поле | Тип | Ограничения | Описание |
|---|---|---|---|
| id | Integer | PK | |
| user_id | Integer | FK → users.id, UNIQUE, NOT NULL | владелец |
| slug | String(40) | UNIQUE, NOT NULL, INDEX | адрес визитки: `^[a-z0-9-]{3,40}$` |
| full_name | String(128) | NOT NULL | ФИО на визитке |
| university | String(256) | NOT NULL, default '' | вуз |
| specialty | String(256) | NOT NULL, default '' | специальность/направление |
| graduation_year | Integer | NULL | год выпуска, 2020–2035 |
| about | Text | NOT NULL, default '' | до 1000 символов |
| skills | JSON | NOT NULL, default [] | массив строк, ≤ 15 элементов, каждая ≤ 40 символов |
| links | JSON | NOT NULL, default [] | массив объектов контактов, ≤ 10 (схема ниже) |
| theme | String(32) | NOT NULL, default 'default' | id темы: default / ocean / sunset / graphite |
| is_published | Boolean | NOT NULL, default false | |
| views_count | Integer | NOT NULL, default 0 | просмотры публичной страницы |
| created_at | DateTime | NOT NULL, default now | |
| updated_at | DateTime | NOT NULL, default now, onupdate now | |

## Формат JSON-колонки `links`

```json
[
  { "type": "telegram", "label": "@daniil", "url": "https://t.me/daniil" },
  { "type": "email", "label": "Почта", "url": "mailto:daniil@example.com" }
]
```

- `type`: одно из `vk | telegram | email | phone | github | site`
- `label`: строка ≤ 60 символов
- `url`: строка ≤ 512 символов, схема только `https://`, `http://`, `mailto:`, `tel:`

## Зарезервированные slug (нельзя занимать)

`admin`, `api`, `login`, `u`, `app`, `edit`, `auth`
