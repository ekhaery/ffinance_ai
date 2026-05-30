export type Category = { id: number; name: string }

export type Subcategory = { id: number; category_id: number; name: string }

export type TemplateDetail = {
  id?: number
  name: string
  category_id: number
  subcategory_id: number
  amount: string
}

export type Template = {
  id: number
  template_name: string
  is_used: boolean
  created_at: string
  template_details: { amount: number }[]
}
