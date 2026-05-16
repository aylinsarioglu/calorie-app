export type FoodItem = {
  name: string
  calories: number
}

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'other'

export type Food = {
  id: string
  name: string
  calories: number
  meal: MealType
  date: string
}

const FOOD_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

export function isValidFoodDate(value: string): boolean {
  if (!FOOD_DATE_PATTERN.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const parsed = new Date(year, month - 1, day)
  return (
    parsed.getFullYear() === year &&
    parsed.getMonth() === month - 1 &&
    parsed.getDate() === day
  )
}

export function getTodayDateString(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** Display order for meal buckets in the UI. */
export const MEAL_CATEGORIES: MealType[] = ['breakfast', 'lunch', 'dinner', 'other']

export const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  other: 'Other',
}

export const FOOD_DATA: FoodItem[] = [
  { name: 'makarna', calories: 350 },
  { name: 'tavuk pilav', calories: 450 },
  { name: 'pizza', calories: 700 },
  { name: 'salata', calories: 150 },
  { name: 'yumurta', calories: 80 },
]

const MAX_TOTAL_CALORIES = Number.MAX_SAFE_INTEGER

export function calculateTotalCalories(foods: Food[]): number {
  let total = 0

  for (const food of foods) {
    total += food.calories
    if (total >= MAX_TOTAL_CALORIES) {
      return MAX_TOTAL_CALORIES
    }
  }

  return total
}

export function getFoodsForDate(foods: Food[], date: string): Food[] {
  return foods.filter((food) => food.date === date)
}

export function getFoodsForMeal(foods: Food[], meal: MealType): Food[] {
  return foods.filter((food) => food.meal === meal)
}

export function sumFoodCalories(foods: Food[]): number {
  return foods.reduce((sum, food) => sum + food.calories, 0)
}

function createUniqueId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export function normalizeFoodName(value: string): string {
  return value.trim()
}

export function createFood(name: string, calories: number, meal: MealType): Food {
  return {
    id: createUniqueId(),
    name: normalizeFoodName(name),
    calories,
    meal,
    date: getTodayDateString(),
  }
}
