const DAYS = [
  'Понедельник',
  'Вторник',
  'Среда',
  'Четверг',
  'Пятница',
  'Суббота',
  'Воскресенье',
];

const MEAL_KEYS = ['breakfast', 'lunch', 'snack', 'dinner'];
const MEAL_LABELS = {
  breakfast: 'Завтрак',
  lunch: 'Обед',
  snack: 'Перекус',
  dinner: 'Ужин',
};

const POOLS = {
  balanced: {
    breakfast: ['Омлет с томатами и тостом', 'Овсянка с бананом и орехами', 'Творог с ягодами и мёдом', 'Яйца + цельнозерновой тост + огурец'],
    lunch: ['Куриная грудка с рисом и овощами', 'Паста с индейкой и томатным соусом', 'Рыба с картофелем и салатом', 'Домашний бургер с овощами'],
    snack: ['Йогурт + гранола + яблоко', 'Хлебцы с творожным сыром', 'Орехи и фрукты', 'Банан + арахисовая паста'],
    dinner: ['Запечённая рыба с овощами', 'Индейка с гречкой', 'Курица в духовке + салат', 'Говядина с овощами на гриле'],
  },
  highProtein: {
    breakfast: ['Яичница с индейкой и сыром', 'Омлет с курицей и шпинатом', 'Творог 5% + ягоды + орехи', 'Скрэмбл с лососем и тостом'],
    lunch: ['Стейк + запечённый картофель + салат', 'Курица терияки с рисом', 'Тунец + киноа + овощи', 'Индейка с гречкой и брокколи'],
    snack: ['Протеиновый йогурт + фрукт', 'Сырники без сахара', 'Яйца и овощи', 'Протеиновый смузи'],
    dinner: ['Лосось + спаржа', 'Куриные котлеты + овощи', 'Телятина + салат', 'Омлет с овощами и сыром'],
  },
  vegetarian: {
    breakfast: ['Овсянка на растительном молоке + ягоды', 'Тост с авокадо и яйцом', 'Гранола + йогурт', 'Сырники с фруктами'],
    lunch: ['Паста с грибами и сливочным соусом', 'Булгур с фалафелем и овощами', 'Гречка с тофу и овощами', 'Карри из нута с рисом'],
    snack: ['Фрукты + орехи', 'Хумус с овощами', 'Йогурт и мюсли', 'Смузи из банана и ягод'],
    dinner: ['Запечённые овощи + сыр', 'Тофу терияки с салатом', 'Овощная лазанья', 'Крем-суп + тост'],
  },
  quick: {
    breakfast: ['Овсянка 5 минут + банан', 'Йогурт + мюсли + ягоды', 'Яйца в микроволновке + тост', 'Тост с арахисовой пастой и яблоком'],
    lunch: ['Гречка + готовая курица + овощи', 'Паста + тунец + томаты', 'Лаваш-ролл с индейкой', 'Рис + омлет + овощи'],
    snack: ['Протеиновый батончик + фрукт', 'Орехи + яблоко', 'Кефир + банан', 'Творожок + ягоды'],
    dinner: ['Рыба в духовке 20 минут + салат', 'Курица на сковороде + овощи', 'Омлет с сыром + овощи', 'Лёгкая шакшука'],
  },
};

const DEFAULT_SETTINGS = {
  profile: 'balanced',
  calories: 2300,
  exclude: [],
  dailyMode: 'on',
};

const ids = {
  weekBody: document.querySelector('#weekBody'),
  todayBadge: document.querySelector('#todayBadge'),
  todayDateText: document.querySelector('#todayDateText'),
  todayCards: document.querySelector('#todayCards'),
  cardTemplate: document.querySelector('#cardTemplate'),
  profileSelect: document.querySelector('#profileSelect'),
  caloriesInput: document.querySelector('#caloriesInput'),
  excludeInput: document.querySelector('#excludeInput'),
  dailyModeSelect: document.querySelector('#dailyModeSelect'),
  saveBtn: document.querySelector('#saveBtn'),
  regenerateBtn: document.querySelector('#regenerateBtn'),
};

const today = new Date();
const mondayIndex = (today.getDay() + 6) % 7;

function loadSettings() {
  try {
    const raw = localStorage.getItem('planner-settings');
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : { ...DEFAULT_SETTINGS };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function saveSettings(settings) {
  localStorage.setItem('planner-settings', JSON.stringify(settings));
}

function dishImageUrl(text) {
  const query = encodeURIComponent(`${text}, healthy food, plate`);
  return `https://source.unsplash.com/600x400/?${query}`;
}

function pickRotating(list, seed) {
  return list[seed % list.length];
}

function applyExclusions(menuText, excludeWords) {
  if (!excludeWords.length) return menuText;
  const blocked = excludeWords.some((w) => menuText.toLowerCase().includes(w));
  return blocked ? '<span class="note">Блюдо заменено по фильтру</span> Салат + белок + сложные углеводы' : menuText;
}

function generateWeek(settings) {
  const storageKey = `planner-week-${today.toDateString()}-${settings.profile}`;
  if (settings.dailyMode === 'off') {
    const cached = localStorage.getItem('planner-week-static');
    if (cached) return JSON.parse(cached);
  } else {
    const cached = localStorage.getItem(storageKey);
    if (cached) return JSON.parse(cached);
  }

  const week = DAYS.map((day, index) => {
    const seed = index + Number(settings.calories % 11);
    const pool = POOLS[settings.profile];
    const meals = {};

    for (const key of MEAL_KEYS) {
      const selected = pickRotating(pool[key], seed + key.length * 7);
      meals[key] = applyExclusions(selected, settings.exclude);
    }

    return { day, meals };
  });

  if (settings.dailyMode === 'off') {
    localStorage.setItem('planner-week-static', JSON.stringify(week));
  } else {
    localStorage.setItem(storageKey, JSON.stringify(week));
  }

  return week;
}

function renderTable(week) {
  ids.weekBody.innerHTML = '';
  week.forEach((item, index) => {
    const tr = document.createElement('tr');
    if (index === mondayIndex) tr.classList.add('today-row');
    tr.innerHTML = `
      <td class="day-col">${item.day.toUpperCase()}</td>
      <td>${item.meals.breakfast}</td>
      <td>${item.meals.lunch}</td>
      <td>${item.meals.snack}</td>
      <td>${item.meals.dinner}</td>
    `;
    ids.weekBody.appendChild(tr);
  });
}

function renderToday(week) {
  const menu = week[mondayIndex];
  ids.todayCards.innerHTML = '';
  for (const meal of MEAL_KEYS) {
    const card = ids.cardTemplate.content.cloneNode(true);
    const img = card.querySelector('img');
    const tag = card.querySelector('.meal-tag');
    const title = card.querySelector('h3');

    const text = menu.meals[meal].replace(/<[^>]+>/g, '');
    img.src = dishImageUrl(text);
    img.alt = `Фото блюда: ${text}`;
    tag.textContent = MEAL_LABELS[meal];
    title.textContent = text;
    ids.todayCards.appendChild(card);
  }
}

function updateTodayLabels() {
  const dayName = DAYS[mondayIndex];
  const dateText = today.toLocaleDateString('ru-RU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  ids.todayBadge.textContent = `Сегодня: ${dayName}`;
  ids.todayDateText.textContent = `Дата: ${dateText}`;
}

function readFormSettings() {
  return {
    profile: ids.profileSelect.value,
    calories: Number(ids.caloriesInput.value || 2300),
    exclude: ids.excludeInput.value
      .split(',')
      .map((v) => v.trim().toLowerCase())
      .filter(Boolean),
    dailyMode: ids.dailyModeSelect.value,
  };
}

function fillForm(settings) {
  ids.profileSelect.value = settings.profile;
  ids.caloriesInput.value = settings.calories;
  ids.excludeInput.value = settings.exclude.join(', ');
  ids.dailyModeSelect.value = settings.dailyMode;
}

function draw(forceNewWeek = false) {
  const settings = readFormSettings();
  if (forceNewWeek) {
    localStorage.removeItem('planner-week-static');
    localStorage.removeItem(`planner-week-${today.toDateString()}-${settings.profile}`);
  }
  const week = generateWeek(settings);
  renderTable(week);
  renderToday(week);
  saveSettings(settings);
}

function init() {
  const settings = loadSettings();
  fillForm(settings);
  updateTodayLabels();
  draw();

  ids.saveBtn.addEventListener('click', () => draw(true));
  ids.regenerateBtn.addEventListener('click', () => draw(true));
}

init();
