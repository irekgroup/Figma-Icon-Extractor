# Figma Icon Extractor

## Описание:

Этот скрипт предназначен для парсинга страниц Figma, поиска и выгрузки иконок в формате SVG.

## Функционал:

### Минимальный:

- Реализован скрипт.
- Запуск происходит через npm.
- Скрипт выгружает иконки в назначенную папку.

### Нормальный:

- Личный токен хранится в виде переменной окружения в отдельном файле .env.local.
- Имеется модуль логирования для информирования пользователя о статусе процесса.
- В консоле имеется возможность указать папку, в которую будут выгружены иконки (если папки нет, то она создается).

## Использование:

1. Установите Node.js и npm.
2. Скачайте репозиторий:
    ```bash
    git clone https://github.com/your-username/figma-icon-extractor.git
    ```
3. Перейдите в папку с репозиторием:
    ```bash
    cd figma-icon-extractor
    ```
4. Установите зависимости:
    ```bash
    npm install
    ```
5. Создайте файл .env.local в корневой папке проекта и добавьте в него строку:
    ```
    FIGMA_TOKEN=<your_figma_token>
    ```
    Замените `<your_figma_token>` на ваш личный токен Figma.
6. Запустите скрипт:
    ```bash
    npm run start
    ```
7. Готово

Пример:

```bash
npm run start 
```

## Логирование:

Скрипт использует модуль chalk для логирования.
Уровень логирования можно изменить, отредактировав файл logger.js.

## Ограничения:

- Скрипт работает только с Figma API.
- Скрипт не может выгружать иконки из плагинов Figma.

## Дополнительно:

- Вы можете добавить поддержку других форматов иконок.
- Вы можете добавить возможность выгрузки иконок из других источников.

## Благодарности:

- Figma team for the Figma API.

## Лицензия:

MIT