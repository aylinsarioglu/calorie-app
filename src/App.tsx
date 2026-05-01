import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
} from 'react'
import './App.css'
import { FOOD_DATA, type FoodItem } from '../foods'

type Food = {
  id: string
  name: string
  calories: number
  meal: 'breakfast' | 'lunch' | 'dinner' | 'other'
}

type MealType = Food['meal']

type MealSection = {
  title: MealType
  foods: Food[]
  totalCalories: number
}

const EMPTY_CALORIES = NaN
const MAX_CALORIES = 1_000_000_000
const MAX_TOTAL_CALORIES = Number.MAX_SAFE_INTEGER
const DAILY_CALORIE_GOAL = 2000
const MEAL_TITLES: MealType[] = ['breakfast', 'lunch', 'dinner', 'other']
const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  other: 'Other',
}

const normalizeFoodName = (value: string): string => value.trim()

const isValidFoodName = (value: string): boolean => normalizeFoodName(value).length > 0

const isValidCalories = (value: number): boolean =>
  Number.isFinite(value) && value > 0 && value <= MAX_CALORIES

const parseCaloriesInput = (value: string): number =>
  value === '' ? EMPTY_CALORIES : Number(value)

const formatCaloriesInput = (value: number): string =>
  Number.isNaN(value) ? '' : String(value)

const createUniqueId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

const createFood = (name: string, calories: number, meal: MealType): Food => ({
  id: createUniqueId(),
  name: normalizeFoodName(name),
  calories,
  meal,
})

const calculateTotalCalories = (foods: Food[]): number => {
  let total = 0

  for (const food of foods) {
    total += food.calories
    if (total >= MAX_TOTAL_CALORIES) {
      return MAX_TOTAL_CALORIES
    }
  }

  return total
}

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
  sections,
  highlightedFoodId,
}: {
  sections: MealSection[]
  highlightedFoodId: string | null
}) {
  return (
    <section className="meal-sections">
      {sections.map((section) => (
        <article key={section.title} className="meal-card">
          <div className="meal-card-header">
            <h3>{MEAL_LABELS[section.title]}</h3>
            <span>{section.totalCalories} kcal</span>
          </div>

          {section.foods.length === 0 ? (
            <p className="meal-empty">No items yet.</p>
          ) : (
            <div className="meal-items">
              {section.foods.map((food) => (
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
  const [foods, setFoods] = useState<Food[]>([])
  const [name, setName] = useState('')
  const [search, setSearch] = useState('')
  const [suggestions, setSuggestions] = useState<FoodItem[]>([])
  const [calories, setCalories] = useState<number>(EMPTY_CALORIES)
  const [meal, setMeal] = useState<MealType>('other')
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
  const mealSections = useMemo<MealSection[]>(
    () =>
      MEAL_TITLES.map((title) => {
        const sectionFoods = foods.filter((food) => food.meal === title)
        return {
          title,
          foods: sectionFoods,
          totalCalories: calculateTotalCalories(sectionFoods),
        }
      }),
    [foods]
  )

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
    setMeal('other')
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

  const handleMealChange = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) => {
      setMeal(event.target.value as MealType)
    },
    []
  )

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
              {search.trim() !== '' ? (
                <div className="meal-items">
                  {suggestions.map((food) => (
                    <div key={food.name} className="meal-item">
                      <span>{food.name}</span>
                      <span>{food.calories} kcal</span>
                    </div>
                  ))}
                </div>
              ) : null}

              <input
                value={formatCaloriesInput(calories)}
                onChange={handleCaloriesChange}
                placeholder="Calories"
                type="number"
              />

              <select value={meal} onChange={handleMealChange}>
                {MEAL_TITLES.map((mealType) => (
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
          <MealSectionList
            sections={mealSections}
            highlightedFoodId={highlightedFoodId}
          />
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
