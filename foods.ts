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
  }
}
