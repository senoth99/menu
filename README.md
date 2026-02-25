# menu

Переписано на Python: логика планировщика меню теперь находится в `planner.py`.

## Запуск

```bash
python planner.py
```

## Параметры

```bash
python planner.py --profile quick --calories 2500 --exclude "лук,грибы" --daily-mode on
```

- `--profile`: `balanced`, `highProtein`, `vegetarian`, `quick`
- `--calories`: 1200..4000
- `--exclude`: слова через запятую для замены блюд
- `--daily-mode`: `on` (обновление по дате) или `off` (статичная неделя)
- `--reset-cache`: очистить кеш недель

Кеш и последние настройки сохраняются в `~/.menu_planner/storage.json`.
