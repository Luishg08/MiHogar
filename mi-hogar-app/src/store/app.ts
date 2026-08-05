import { create } from 'zustand'
import type { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { sanitizeTheme, applyTheme } from '@/lib/theme'
import type {
  Category,
  Home,
  HomeMember,
  InventoryEvent,
  Product,
  Profile,
  ShoppingItem,
  Unit
} from '@/types'

interface AppState {
  user: User | null
  profile: Profile | null
  home: Home | null
  members: HomeMember[]
  products: Product[]
  shoppingItems: ShoppingItem[]
  events: InventoryEvent[]
  categories: Category[]
  units: Unit[]
  online: boolean
  ready: boolean
  loaded: boolean

  bootstrap: () => Promise<void>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<Profile | null>
  saveProfile: (patch: Partial<Profile>) => Promise<void>

  loadAll: () => Promise<void>
  loadProducts: () => Promise<void>
  loadShopping: () => Promise<void>
  loadEvents: () => Promise<void>
  loadMembers: () => Promise<void>
  loadCategories: () => Promise<void>
  loadUnits: () => Promise<void>
  attachCategoriesToProducts: (products: Product[]) => Promise<void>
  subscribeRealtime: (homeId: string) => void

  setHome: (home: Home) => void
  setOnline: (online: boolean) => void

  createHome: (name: string) => Promise<void>
  joinHome: (code: string) => Promise<void>

  addProduct: (input: Partial<Product> & { name: string }) => Promise<Product>
  updateProduct: (id: string, patch: Partial<Product>) => Promise<void>
  deleteProduct: (id: string) => Promise<void>
  adjustQuantity: (id: string, delta: number) => Promise<void>

  addShoppingItem: (input: Partial<ShoppingItem> & { name: string }) => Promise<void>
  deleteShoppingItem: (id: string) => Promise<void>
  markPurchased: (id: string) => Promise<void>
  toggleChecked: (id: string, checked: boolean) => Promise<void>
  updateShoppingItem: (id: string, patch: Partial<ShoppingItem>) => Promise<void>
  addToShoppingFromProducts: (productIds: string[]) => Promise<void>

  clearData: () => void
}

let channels: ReturnType<typeof supabase.channel>[] = []
let debounceTimer: ReturnType<typeof setTimeout> | null = null

function debounce(fn: () => void, ms = 250) {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(fn, ms)
}

export const useAppStore = create<AppState>((set, get) => ({
  user: null,
  profile: null,
  home: null,
  members: [],
  products: [],
  shoppingItems: [],
  events: [],
  categories: [],
  units: [],
  online: navigator.onLine,
  ready: false,
  loaded: false,

  setOnline: (online) => set({ online }),

  bootstrap: async () => {
    const {
      data: { session }
    } = await supabase.auth.getSession()
    if (session?.user) {
      applyTheme(sanitizeTheme(session.user.user_metadata?.theme))
      set({ user: session.user })
      await get().refreshProfile()
      await get().loadAll()
    }
    set({ ready: true })

    supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        set({ user: session.user })
        void get().refreshProfile().then(() => get().loadAll())
      } else {
        set({ user: null, profile: null, home: null })
        get().clearData()
      }
    })
  },

  signOut: async () => {
    get().clearData()
    await supabase.auth.signOut()
  },

  clearData: () => {
    channels.forEach((ch) => void supabase.removeChannel(ch))
    channels = []
    set({
      home: null,
      members: [],
      products: [],
      shoppingItems: [],
      events: [],
      categories: [],
      units: [],
      loaded: false
    })
  },

  refreshProfile: async () => {
    const { user } = get()
    if (!user) return null
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()
    if (error) {
      console.error('refreshProfile', error)
      return get().profile
    }
    if (data) {
      const profile = { ...data, theme: sanitizeTheme(data.theme) }
      applyTheme(profile.theme)
      set({ profile })
      return profile
    }
    return get().profile
  },

  saveProfile: async (patch) => {
    const { user, profile } = get()
    if (!user) return
    let next: Profile = { ...(profile as Profile), ...patch }
    if (patch.theme) {
      next.theme = sanitizeTheme(patch.theme)
      applyTheme(next.theme)
    }
    set({ profile: next })
    const { error } = await supabase
      .from('profiles')
      .update({ ...patch, theme: patch.theme ?? (profile?.theme ?? null) })
      .eq('id', user.id)
    if (error) {
      console.error('saveProfile', error)
      void get().refreshProfile()
    }
  },

  loadCategories: async () => {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name')
    if (!error && data) set({ categories: data })
  },

  loadUnits: async () => {
    const { data, error } = await supabase.from('units').select('*').order('name')
    if (!error && data) set({ units: data })
  },

  loadMembers: async () => {
    const { home } = get()
    if (!home) return
    const { data, error } = await supabase
      .from('home_members')
      .select('home_id, user_id, role, joined_at')
      .eq('home_id', home.id)
    if (error) return
    const ids = data.map((m) => m.user_id)
    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .in('id', ids.length ? ids : ['00000000-0000-0000-0000-000000000000'])
    const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]))
    set({
      members: data.map((m) => ({
        ...m,
        profile: m.user_id in profileMap ? profileMap.get(m.user_id) : undefined
      }))
    })
  },

  loadProducts: async () => {
    const { home } = get()
    if (!home) return
    const [productsRes, categoriesRes] = await Promise.all([
      supabase.from('products').select('*').eq('home_id', home.id).order('name'),
      supabase.from('categories').select('*').order('name')
    ])
    if (productsRes.error || categoriesRes.error) return
    set({
      categories: categoriesRes.data ?? [],
      products: productsRes.data ?? []
    })
    void get().attachCategoriesToProducts(productsRes.data ?? [])
  },

  attachCategoriesToProducts: async (products: Product[]) => {
    if (!products.length) return
    const { data: links, error } = await supabase
      .from('product_categories')
      .select('product_id, category_id')
      .in('product_id', products.map((p) => p.id))
    if (error) return
    const catMap = new Map(get().categories.map((c) => [c.id, c]))
    const byProduct = new Map<string, Category[]>()
    for (const link of links ?? []) {
      const cat = catMap.get(link.category_id)
      if (!cat) continue
      const list = byProduct.get(link.product_id) ?? []
      list.push(cat)
      byProduct.set(link.product_id, list)
    }
    set({
      products: products.map((p) => ({
        ...p,
        categories: byProduct.get(p.id) ?? []
      }))
    })
  },

  loadShopping: async () => {
    const { home } = get()
    if (!home) return
    const { data, error } = await supabase
      .from('shopping_items')
      .select('*')
      .eq('home_id', home.id)
      .order('checked')
      .order('created_at', { ascending: false })
    if (!error && data) set({ shoppingItems: data })
  },

  loadEvents: async () => {
    const { home, members } = get()
    if (!home) return
    const { data, error } = await supabase
      .from('inventory_events')
      .select('*')
      .eq('home_id', home.id)
      .order('created_at', { ascending: false })
      .limit(100)
    if (error) return
    const profileMap = new Map(members.map((m) => [m.user_id, m.profile]))
    set({
      events: (data ?? []).map((e) => ({
        ...e,
        profile: e.user_id ? profileMap.get(e.user_id) : undefined
      }))
    })
  },

  loadAll: async () => {
    const { user } = get()
    if (!user) return
    await get().loadCategories()
    await get().loadUnits()

    const { data: membership } = await supabase
      .from('home_members')
      .select('home_id')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle()

    if (membership?.home_id) {
      const { data: home } = await supabase
        .from('homes')
        .select('*')
        .eq('id', membership.home_id)
        .single()
      if (home) {
        set({ home })
        await get().loadMembers()
        await get().loadProducts()
        await get().loadShopping()
        await get().loadEvents()
        get().subscribeRealtime(home.id)
        set({ loaded: true })
        return
      }
    }

    const { data: owned } = await supabase
      .from('homes')
      .select('*')
      .eq('owner_id', user.id)
      .limit(1)
      .maybeSingle()
    if (owned) {
      set({ home: owned })
      await get().loadMembers()
      await get().loadProducts()
      await get().loadShopping()
      await get().loadEvents()
      get().subscribeRealtime(owned.id)
      set({ loaded: true })
    }
  },

  setHome: (home) => set({ home }),

  subscribeRealtime: (homeId) => {
    if (channels.length) {
      channels.forEach((ch) => void supabase.removeChannel(ch))
      channels = []
    }

    const refresh = (fn: () => void) => () => debounce(fn)

    const productsCh = supabase
      .channel(`products-${homeId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products', filter: `home_id=eq.${homeId}` },
        refresh(() => void get().loadProducts())
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'product_categories' },
        refresh(() => void get().loadProducts())
      )
      .subscribe()
    channels.push(productsCh)

    const shoppingCh = supabase
      .channel(`shopping-${homeId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'shopping_items', filter: `home_id=eq.${homeId}` },
        refresh(() => void get().loadShopping())
      )
      .subscribe()
    channels.push(shoppingCh)

    const eventsCh = supabase
      .channel(`events-${homeId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'inventory_events', filter: `home_id=eq.${homeId}` },
        refresh(() => void get().loadEvents())
      )
      .subscribe()
    channels.push(eventsCh)

    const membersCh = supabase
      .channel(`members-${homeId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'home_members', filter: `home_id=eq.${homeId}` },
        refresh(() => void get().loadMembers())
      )
      .subscribe()
    channels.push(membersCh)
  },

  // ---- Mutaciones ----

  createHome: async (name) => {
    const { error, data } = await supabase.rpc('create_home', { p_name: name })
    if (error) throw error
    await get().loadAll()
    void data
  },

  joinHome: async (code) => {
    const { error } = await supabase.rpc('join_home', { p_code: code })
    if (error) throw error
    await get().loadAll()
  },

  addProduct: async (input) => {
    const { home, user } = get()
    if (!home || !user) throw new Error('Sin hogar')
    const { data, error } = await supabase
      .from('products')
      .insert({ ...input, home_id: home.id, created_by: user.id, updated_by: user.id })
      .select()
      .single()
    if (error) throw error
    await get().loadProducts()
    return data as Product
  },

  updateProduct: async (id, patch) => {
    const { user } = get()
    const { error } = await supabase
      .from('products')
      .update({ ...patch, updated_by: user?.id ?? null })
      .eq('id', id)
    if (error) throw error
    await get().loadProducts()
  },

  deleteProduct: async (id) => {
    const { error } = await supabase.from('products').delete().eq('id', id)
    if (error) throw error
    await get().loadProducts()
  },

  adjustQuantity: async (id, delta) => {
    const { error } = await supabase.rpc('adjust_quantity', { p_product_id: id, p_delta: delta })
    if (error) throw error
    await get().loadProducts()
  },

  addShoppingItem: async (input) => {
    const { home, user } = get()
    if (!home || !user) throw new Error('Sin hogar')
    const { error } = await supabase
      .from('shopping_items')
      .insert({ ...input, home_id: home.id, added_by: user.id })
    if (error) throw error
    await get().loadShopping()
  },

  updateShoppingItem: async (id, patch) => {
    const { error } = await supabase.from('shopping_items').update(patch).eq('id', id)
    if (error) throw error
    await get().loadShopping()
  },

  deleteShoppingItem: async (id) => {
    const { error } = await supabase.from('shopping_items').delete().eq('id', id)
    if (error) throw error
    await get().loadShopping()
  },

  markPurchased: async (id) => {
    const { error } = await supabase.rpc('mark_purchased', { p_item_id: id })
    if (error) throw error
    await get().loadShopping()
    await get().loadProducts()
    await get().loadEvents()
  },

  toggleChecked: async (id, checked) => {
    if (checked) {
      await get().markPurchased(id)
    } else {
      const { error } = await supabase
        .from('shopping_items')
        .update({ checked: false, checked_by: null, purchased_at: null })
        .eq('id', id)
      if (error) throw error
      await get().loadShopping()
    }
  },

  addToShoppingFromProducts: async (productIds) => {
    const { home, user, products } = get()
    if (!home || !user) throw new Error('Sin hogar')
    const selected = products.filter((p) => productIds.includes(p.id))
    if (!selected.length) return
    const rows = selected.map((p) => ({
      home_id: home.id,
      name: p.name,
      quantity: 1,
      unit: p.unit,
      product_id: p.id,
      added_by: user.id
    }))
    const { error } = await supabase.from('shopping_items').insert(rows)
    if (error) throw error
    await get().loadShopping()
  }
}))
