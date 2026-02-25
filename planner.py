#!/usr/bin/env python3
"""CLI weekly food planner (Python rewrite of the JS planner logic)."""

from __future__ import annotations

import argparse
import datetime as dt
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List

DAYS = [
    "Понедельник",
    "Вторник",
    "Среда",
    "Четверг",
    "Пятница",
    "Суббота",
    "Воскресенье",
]

MEAL_KEYS = ["breakfast", "lunch", "snack", "dinner"]
MEAL_LABELS = {
    "breakfast": "Завтрак",
    "lunch": "Обед",
    "snack": "Перекус",
    "dinner": "Ужин",
}

POOLS: Dict[str, Dict[str, List[str]]] = {
    "balanced": {
        "breakfast": [
            "Омлет с томатами и тостом",
            "Овсянка с бананом и орехами",
            "Творог с ягодами и мёдом",
            "Яйца + цельнозерновой тост + огурец",
        ],
        "lunch": [
            "Куриная грудка с рисом и овощами",
            "Паста с индейкой и томатным соусом",
            "Рыба с картофелем и салатом",
            "Домашний бургер с овощами",
        ],
        "snack": [
            "Йогурт + гранола + яблоко",
            "Хлебцы с творожным сыром",
            "Орехи и фрукты",
            "Банан + арахисовая паста",
        ],
        "dinner": [
            "Запечённая рыба с овощами",
            "Индейка с гречкой",
            "Курица в духовке + салат",
            "Говядина с овощами на гриле",
        ],
    },
    "highProtein": {
        "breakfast": [
            "Яичница с индейкой и сыром",
            "Омлет с курицей и шпинатом",
            "Творог 5% + ягоды + орехи",
            "Скрэмбл с лососем и тостом",
        ],
        "lunch": [
            "Стейк + запечённый картофель + салат",
            "Курица терияки с рисом",
            "Тунец + киноа + овощи",
            "Индейка с гречкой и брокколи",
        ],
        "snack": [
            "Протеиновый йогурт + фрукт",
            "Сырники без сахара",
            "Яйца и овощи",
            "Протеиновый смузи",
        ],
        "dinner": [
            "Лосось + спаржа",
            "Куриные котлеты + овощи",
            "Телятина + салат",
            "Омлет с овощами и сыром",
        ],
    },
    "vegetarian": {
        "breakfast": [
            "Овсянка на растительном молоке + ягоды",
            "Тост с авокадо и яйцом",
            "Гранола + йогурт",
            "Сырники с фруктами",
        ],
        "lunch": [
            "Паста с грибами и сливочным соусом",
            "Булгур с фалафелем и овощами",
            "Гречка с тофу и овощами",
            "Карри из нута с рисом",
        ],
        "snack": ["Фрукты + орехи", "Хумус с овощами", "Йогурт и мюсли", "Смузи из банана и ягод"],
        "dinner": [
            "Запечённые овощи + сыр",
            "Тофу терияки с салатом",
            "Овощная лазанья",
            "Крем-суп + тост",
        ],
    },
    "quick": {
        "breakfast": [
            "Овсянка 5 минут + банан",
            "Йогурт + мюсли + ягоды",
            "Яйца в микроволновке + тост",
            "Тост с арахисовой пастой и яблоком",
        ],
        "lunch": [
            "Гречка + готовая курица + овощи",
            "Паста + тунец + томаты",
            "Лаваш-ролл с индейкой",
            "Рис + омлет + овощи",
        ],
        "snack": [
            "Протеиновый батончик + фрукт",
            "Орехи + яблоко",
            "Кефир + банан",
            "Творожок + ягоды",
        ],
        "dinner": [
            "Рыба в духовке 20 минут + салат",
            "Курица на сковороде + овощи",
            "Омлет с сыром + овощи",
            "Лёгкая шакшука",
        ],
    },
}

DEFAULT_SETTINGS = {
    "profile": "balanced",
    "calories": 2300,
    "exclude": [],
    "daily_mode": "on",
}


@dataclass
class Settings:
    profile: str = "balanced"
    calories: int = 2300
    exclude: List[str] | None = None
    daily_mode: str = "on"

    def normalized(self) -> "Settings":
        exclude = [w.strip().lower() for w in (self.exclude or []) if w.strip()]
        profile = self.profile if self.profile in POOLS else DEFAULT_SETTINGS["profile"]
        daily_mode = self.daily_mode if self.daily_mode in {"on", "off"} else "on"
        calories = max(1200, min(4000, int(self.calories)))
        return Settings(profile=profile, calories=calories, exclude=exclude, daily_mode=daily_mode)


class PlannerStorage:
    def __init__(self, path: Path) -> None:
        self.path = path
        self.path.parent.mkdir(parents=True, exist_ok=True)

    def load(self) -> dict:
        if not self.path.exists():
            return {}
        try:
            return json.loads(self.path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            return {}

    def save(self, payload: dict) -> None:
        self.path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def pick_rotating(items: List[str], seed: int) -> str:
    return items[seed % len(items)]


def apply_exclusions(menu_text: str, exclude_words: List[str]) -> str:
    if not exclude_words:
        return menu_text
    blocked = any(word in menu_text.lower() for word in exclude_words)
    if blocked:
        return "Блюдо заменено по фильтру: Салат + белок + сложные углеводы"
    return menu_text


def generate_week(settings: Settings, today: dt.date, cache: dict) -> list:
    settings = settings.normalized()
    profile = settings.profile
    date_key = today.isoformat()

    if settings.daily_mode == "off":
        week_key = "static"
    else:
        week_key = f"{date_key}-{profile}"

    week_cache = cache.setdefault("weeks", {})
    if week_key in week_cache:
        return week_cache[week_key]

    week = []
    for day_index, day_name in enumerate(DAYS):
        seed = day_index + (settings.calories % 11)
        day_meals = {}
        for meal in MEAL_KEYS:
            text = pick_rotating(POOLS[profile][meal], seed + len(meal))
            day_meals[meal] = apply_exclusions(text, settings.exclude or [])
        week.append({"day": day_name, "meals": day_meals})

    week_cache[week_key] = week
    return week


def print_week(week: list, today_idx: int) -> None:
    print("\n=== План питания на неделю ===")
    for idx, day in enumerate(week):
        marker = " ← сегодня" if idx == today_idx else ""
        print(f"\n{day['day']}{marker}")
        for meal in MEAL_KEYS:
            print(f"  {MEAL_LABELS[meal]}: {day['meals'][meal]}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Weekly Food Planner (Python)")
    parser.add_argument("--profile", choices=list(POOLS.keys()), default=DEFAULT_SETTINGS["profile"])
    parser.add_argument("--calories", type=int, default=DEFAULT_SETTINGS["calories"])
    parser.add_argument(
        "--exclude",
        default="",
        help="Список слов для исключения через запятую (например: лук,грибы)",
    )
    parser.add_argument("--daily-mode", choices=["on", "off"], default=DEFAULT_SETTINGS["daily_mode"])
    parser.add_argument("--reset-cache", action="store_true", help="Очистить кеш недель перед генерацией")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    today = dt.date.today()
    today_idx = today.weekday()

    storage = PlannerStorage(Path.home() / ".menu_planner" / "storage.json")
    payload = storage.load()

    if args.reset_cache:
        payload["weeks"] = {}

    settings = Settings(
        profile=args.profile,
        calories=args.calories,
        exclude=args.exclude.split(",") if args.exclude else [],
        daily_mode=args.daily_mode,
    ).normalized()

    payload["settings"] = {
        "profile": settings.profile,
        "calories": settings.calories,
        "exclude": settings.exclude,
        "daily_mode": settings.daily_mode,
    }

    week = generate_week(settings, today=today, cache=payload)
    storage.save(payload)

    print(f"Сегодня: {DAYS[today_idx]}, дата: {today.isoformat()}")
    print(f"Профиль: {settings.profile}, калории: {settings.calories}, daily_mode: {settings.daily_mode}")
    if settings.exclude:
        print(f"Исключения: {', '.join(settings.exclude)}")

    print_week(week, today_idx=today_idx)


if __name__ == "__main__":
    main()
