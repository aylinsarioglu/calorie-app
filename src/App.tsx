import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
} from 'react'
import './App.css'
import {
  FOOD_DATA,
  MEAL_CATEGORIES,
  MEAL_LABELS,
  calculateTotalCalories,
  createFood,
  getFoodsForMeal,
  normalizeFoodName,
  sumFoodCalories,
  type Food,
  type FoodItem,
  type MealType,
} from '../foods'

const EMPTY_CALORIES = NaN
const MAX_CALORIES = 1_000_000_000
const DAILY_CALORIE_GOAL = 2000
const FOODS_STORAGE_KEY = 'calorie-app-foods'

const isValidFoodName = (value: string): boolean => normalizeFoodName(value).length > 0

const isValidCalories = (value: number): boolean =>
  Number.isFinite(value) && value > 0 && value <= MAX_CALORIES

const isMealType = (value: unknown): value is MealType =>
  typeof value === 'string' && MEAL_CATEGORIES.includes(value as MealType)

function isValidStoredFood(value: unknown): value is Food {
  if (value === null || typeof value !== 'object') return false
  const record = value as Record<string, unknown>
  const id = record.id
  const name = record.name
  const calories = record.calories
  const meal = record.meal
  if (typeof id !== 'string' || id.trim() === '') return false
  if (typeof name !== 'string' || !isValidFoodName(name)) return false
  if (typeof calories !== 'number' || !isValidCalories(calories)) return false
  if (!isMealType(meal)) return false
  return true
}

function loadPersistedFoods(): Food[] {
  if (typeof window === 'undefined') return []
  let raw: string | null
  try {
    raw = window.localStorage.getItem(FOODS_STORAGE_KEY)
  } catch {
    return []
  }
  if (raw == null || raw === '') return []

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return []
  }

  if (!Array.isArray(parsed)) return []

  const result: Food[] = []
  for (const item of parsed) {
    if (!isValidStoredFood(item)) continue
    result.push({
      id: item.id.trim(),
      name: normalizeFoodName(item.name),
      calories: item.calories,
      meal: item.meal,
    })
  }
  return result
}

const parseCaloriesInput = (value: string): number =>
  value === '' ? EMPTY_CALORIES : Number(value)

const formatCaloriesInput = (value: number): string =>
  Number.isNaN(value) ? '' : String(value)

function SummaryCard({
  eatenCalories,
  goalCalories,
}: {
  eatenCalories: number
  goalCalories: number
}) {
  const remainingCalories = goalCalories - eatenCalories
  const progress = goalCalories > 0 ? (eatenCalories / goalCalories) * 100 : 0
  const normalizedProgress = Math.min(Math.max(progress, 0), 100)
  const progressPercentage = Math.round(normalizedProgress)
  const ringRadius = 34
  const ringCircumference = 2 * Math.PI * ringRadius
  const ringOffset =
    ringCircumference - (normalizedProgress / 100) * ringCircumference

  return (
    <section className="summary-card">
      <div className="summary-card-content">
        <p className="summary-card-label">Daily Goal</p>
        <h2>{eatenCalories} kcal eaten</h2>
        <p className="summary-card-remaining">{remainingCalories} kcal remaining</p>
      </div>

      <div className="summary-progress" aria-label={`${progressPercentage}% of daily goal`}>
        <svg viewBox="0 0 80 80" className="summary-progress-svg" role="img">
          <circle className="summary-progress-track" cx="40" cy="40" r={ringRadius} />
          <circle
            className="summary-progress-value"
            cx="40"
            cy="40"
            r={ringRadius}
            strokeDasharray={ringCircumference}
            strokeDashoffset={ringOffset}
          />
        </svg>
        <div className="summary-progress-inner">
          <span>{progressPercentage}%</span>
        </div>
      </div>
    </section>
  )
}

function MealSectionList({
  foods,
  highlightedFoodId,
}: {
  foods: Food[]
  highlightedFoodId: string | null
}) {
  const sections = useMemo(
    () =>
      MEAL_CATEGORIES.map((mealType) => {
        const mealFoods = getFoodsForMeal(foods, mealType)
        return {
          mealType,
          foods: mealFoods,
          totalCalories: sumFoodCalories(mealFoods),
        }
      }),
    [foods]
  )

  return (
    <section className="meal-sections">
      {sections.map(({ mealType, foods: mealFoods, totalCalories }) => (
        <article key={mealType} className="meal-card">
          <div className="meal-card-header">
            <h3>{MEAL_LABELS[mealType]}</h3>
            <span>{totalCalories} kcal</span>
          </div>

          {mealFoods.length === 0 ? (
            <p className="meal-empty">No items yet.</p>
          ) : (
            <div className="meal-items">
              {mealFoods.map((food) => (
                <div
                  key={food.id}
                  className={`meal-item${highlightedFoodId === food.id ? ' meal-item-new' : ''}`}
                >
                  <span>{food.name}</span>
                  <span>{food.calories} kcal</span>
                </div>
              ))}
            </div>
          )}
        </article>
      ))}
    </section>
  )
}

function App() {
  const [foods, setFoods] = useState<Food[]>(loadPersistedFoods)
  const [name, setName] = useState('')
  const [search, setSearch] = useState('')
  const [suggestions, setSuggestions] = useState<FoodItem[]>([])
  const [calories, setCalories] = useState<number>(EMPTY_CALORIES)
  const [meal, setMeal] = useState<MealType>('breakfast')
  const [isAddFormOpen, setIsAddFormOpen] = useState(false)
  const [showValidation, setShowValidation] = useState(false)
  const [highlightedFoodId, setHighlightedFoodId] = useState<string | null>(null)
  const currentDate = useMemo(
    () =>
      new Intl.DateTimeFormat('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      }).format(new Date()),
    []
  )

  const isFormValid = useMemo(
    () => isValidFoodName(name) && isValidCalories(calories),
    [name, calories]
  )

  const totalCalories = useMemo(() => calculateTotalCalories(foods), [foods])

  const handleAddFood = useCallback(() => {
    if (!isFormValid) {
      setShowValidation(true)
      return
    }

    const newFood = createFood(name, calories, meal)
    setFoods((prev) => [...prev, newFood])
    setHighlightedFoodId(newFood.id)
    setName('')
    setSearch('')
    setSuggestions([])
    setCalories(EMPTY_CALORIES)
    setMeal('breakfast')
    setShowValidation(false)
    setIsAddFormOpen(false)
  }, [isFormValid, name, calories, meal])

  const handleSearch = useCallback((value: string) => {
    setSearch(value)

    if (value.trim() === '') {
      setSuggestions([])
      return
    }

    const normalizedSearch = value.toLowerCase()
    const filteredFoods = FOOD_DATA.filter((food) =>
      food.name.toLowerCase().includes(normalizedSearch)
    ).slice(0, 5)

    setSuggestions(filteredFoods)
  }, [])

  const handleSuggestionSelect = useCallback((food: FoodItem) => {
    setName(food.name)
    setSearch(food.name)
    setCalories(food.calories)
    setSuggestions([])
    setShowValidation(false)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem(FOODS_STORAGE_KEY, JSON.stringify(foods))
    } catch {
      // ignore quota / private mode
    }
  }, [foods])

  useEffect(() => {
    if (!highlightedFoodId) return
    const timeoutId = window.setTimeout(() => setHighlightedFoodId(null), 1200)
    return () => window.clearTimeout(timeoutId)
  }, [highlightedFoodId])

  const handleNameChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value
      setName(value)
      handleSearch(value)
      setShowValidation(false)
    },
    [handleSearch]
  )

  const handleCaloriesChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setCalories(parseCaloriesInput(event.target.value))
      setShowValidation(false)
    },
    []
  )

  const handleMealChange = useCallback((event: ChangeEvent<HTMLSelectElement>) => {
    setMeal(event.target.value as MealType)
  }, [])

  const handleAddFoodSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      handleAddFood()
    },
    [handleAddFood]
  )

  return (
    <main className="app-shell">
      <div className="phone-frame">
        <header className="app-header">
          <p className="header-label">Today</p>
          <h1 className="header-date">{currentDate}</h1>
        </header>

        <SummaryCard eatenCalories={totalCalories} goalCalories={DAILY_CALORIE_GOAL} />

        <section className="summary-section">
          <h2>Summary</h2>
          <p>Total Calories: {totalCalories} kcal</p>
          <p>Items: {foods.length}</p>
        </section>

        {isAddFormOpen ? (
          <section className="add-food-panel">
            <h2>Add Food</h2>
            <form className="form-row" onSubmit={handleAddFoodSubmit}>
              <input
                value={search}
                onChange={handleNameChange}
                placeholder="Food name"
              />
              {search.trim() !== '' && suggestions.length > 0 ? (
                <div className="meal-items">
                  {suggestions.map((food, index) => (
                    <button
                      key={`${food.name}-${food.calories}-${index}`}
                      type="button"
                      className="meal-item"
                      onClick={() => handleSuggestionSelect(food)}
                    >
                      <span>{food.name}</span>
                      <span>{food.calories} kcal</span>
                    </button>
                  ))}
                </div>
              ) : null}

              <input
                value={formatCaloriesInput(calories)}
                onChange={handleCaloriesChange}
                placeholder="Calories"
                type="number"
              />

              <label htmlFor="meal-select" className="meal-picker-label">
                Meal
              </label>
              <select
                id="meal-select"
                value={meal}
                onChange={handleMealChange}
                aria-label="Meal"
              >
                {MEAL_CATEGORIES.map((mealType) => (
                  <option key={mealType} value={mealType}>
                    {MEAL_LABELS[mealType]}
                  </option>
                ))}
              </select>

              <button type="submit" disabled={!isFormValid}>
                Add
              </button>
              {showValidation && !isFormValid ? (
                <p className="validation-message">
                  Please enter a food name and a valid positive calorie value.
                </p>
              ) : null}
            </form>
          </section>
        ) : null}

        <section className="foods-section">
          <h2>Meals</h2>
          <MealSectionList foods={foods} highlightedFoodId={highlightedFoodId} />
        </section>

        <button
          type="button"
          className="fab"
          aria-label="Add food"
          onClick={() => setIsAddFormOpen((prev) => !prev)}
        >
          +
        </button>
      </div>
    </main>
  )
}

export default App
