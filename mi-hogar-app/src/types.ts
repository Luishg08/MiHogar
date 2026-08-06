export interface Profile {
  id: string
  full_name: string
  avatar_url: string | null
  profile_color: string
  theme: Theme
  is_admin: boolean
  status: 'pending' | 'approved' | 'rejected'
  active_home_id: string | null
  background_url: string | null
  created_at: string
  updated_at: string
}

export interface Theme {
  mode: 'light' | 'dark'
  primary: string
  accent: string
}

export interface Home {
  id: string
  name: string
  invite_code: string
  owner_id: string
  created_at: string
}

export interface MyHome extends Home {
  role: string
  joined_at: string
}

export interface HomeMember {
  home_id: string
  user_id: string
  role: string
  joined_at: string
  profile?: Profile
}

export interface Category {
  id: string
  name: string
  emoji: string
  color: string
  is_default: boolean
}

export interface Unit {
  id: string
  name: string
  symbol: string
}

export interface Product {
  id: string
  home_id: string
  name: string
  quantity: number
  unit: string
  min_quantity: number
  photo_url: string | null
  emoji: string
  notes: string | null
  expiry_date: string | null
  barcode: string | null
  created_by: string | null
  updated_by: string | null
  created_at: string
  updated_at: string
  categories?: Category[]
}

export interface ShoppingItem {
  id: string
  home_id: string
  name: string
  quantity: number
  unit: string
  note: string | null
  price: number | null
  product_id: string | null
  checked: boolean
  added_by: string | null
  checked_by: string | null
  purchased_at: string | null
  created_at: string
  updated_at: string
}

export type InventoryAction =
  | 'creado'
  | 'actualizado'
  | 'eliminado'
  | 'comprado'
  | 'consumido'
  | 'agregado a la lista'
  | 'eliminado de la lista'

export interface InventoryEvent {
  id: number
  home_id: string | null
  user_id: string | null
  action: InventoryAction
  entity_type: string
  entity_id: string | null
  details: Record<string, unknown> | null
  created_at: string
  profile?: Profile
}

export interface MealSuggestion {
  title: string
  type: 'desayuno' | 'almuerzo' | 'cena' | 'snack' | 'bebida'
  ingredients: string[]
  instructions: string
  usesInventory: string[]
  timeMinutes: number
}

export interface RecipeAnswer {
  title: string
  recipe: string
  suggestions: string[]
}

export interface ConsumeDeduction {
  product_id: string
  name: string
  quantity: number
  unit: string
}

export interface ConsumeResult {
  product_id: string
  name: string
  quantity: number
  new_quantity: number
}

export interface AdminUser {
  id: string
  email: string
  full_name: string
  status: 'pending' | 'approved' | 'rejected'
  is_admin: boolean
  avatar_url: string | null
  profile_color: string
  created_at: string
}

export interface ReceiptItem {
  name: string
  quantity: number
  unit: string
  category?: string
}
