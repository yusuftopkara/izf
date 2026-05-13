const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  token?: string
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data?.detail || data?.message || 'API hatası')
  }
  return data as T
}

export interface MeResponse {
  id: string
  email: string
  name: string
  role: 'admin' | 'user' | 'staff' | 'guest'
}

export interface AdminEvent {
  id: string
  title: string
  date?: string
  location?: string
  price?: number
  capacity: number
  tickets_sold?: number
  description?: string
}

export interface CreateEventRequest {
  title: string
  date?: string
  location?: string
  price?: number
  capacity: number
  description?: string
}

export interface Event {
  id: string
  title: string
  date?: string
  capacity: number
  tickets_sold: number
  price?: number
  payment_link?: string
  discounted_payment_link?: string
}

export interface InitPaymentRequest {
  event_id: string
  buyer_email: string
  buyer_name: string
  buyer_phone: string
  discount_code?: string
  quantity?: number
}

export interface InitPaymentResponse {
  pending_id: string
  payment_url: string
}

export interface CompletePaymentResponse {
  success: boolean
  ticket_id?: string
  event_title?: string
  quantity?: number
  status?: string
  qr_token?: string
}

export interface PaymentStatusResponse {
  success: boolean
  status: string
  ticket_id?: string
  event_title?: string
  quantity?: number
  qr_token?: string
}

export interface LoginResponse {
  access_token: string
  token_type: string
}

export interface RegisterResponse {
  id: string
  email: string
  name: string
}

export interface Ticket {
  id: string
  event_title: string
  qr_token: string
  status?: 'active' | 'used'
  created_at?: string
}

export interface DiscountValidateResponse {
  valid: boolean
  discount_type?: 'percentage' | 'fixed'
  discount_value?: number
  discounted_price?: number
  original_price?: number
  message?: string
}

export interface AdminStats {
  total_users: number
  total_tickets: number
  tickets_used: number
  total_events: number
  total_revenue?: number
}

export interface Discount {
  id: string
  code: string
  discount_type: 'percentage' | 'fixed'
  value: number
  valid_from?: string
  valid_until?: string
  max_uses?: number
  uses_count: number
  is_active: boolean
}

export interface CreateDiscountRequest {
  code: string
  discount_type: 'percentage' | 'fixed'
  value: number
  valid_from?: string
  valid_until?: string
  max_uses?: number
}

export interface AdminUser {
  id: string
  email: string
  name: string
  role: 'user' | 'staff' | 'admin'
  created_at?: string
  tickets_count?: number
}

export interface AdminTicket {
  id: string
  ticket_id?: string
  event_id?: string
  event_title: string
  event_date?: string
  event_location?: string
  user_id?: string | null
  user_name?: string
  user_email?: string
  buyer_name?: string
  buyer_email?: string
  buyer_phone?: string
  source?: 'user' | 'guest' | 'offline'
  is_offline?: boolean
  is_assigned?: boolean
  note?: string
  qr_token: string
  quantity?: number
  status: 'VALID' | 'USED'
  created_at?: string
  guest_email?: string
}

// Site Content types
export interface SiteContent {
  hero_video?: {
    url?: string
    type?: 'youtube' | 'mp4'
  }
  countdown_target?: string
  beto_perez?: {
    enabled?: boolean
    title?: string
    subtitle?: string
    description?: string
    image_url?: string
    button_text?: string
    button_link?: string
    title_en?: string
    subtitle_en?: string
    description_en?: string
    button_text_en?: string
  }
  venue?: {
    name?: string
    address?: string
    map_embed_url?: string
    description?: string
    address_en?: string
    description_en?: string
  }
}

export const api = {
  async login(email: string, password: string): Promise<LoginResponse> {
    return apiFetch<LoginResponse>('/api/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
  },

  async register(name: string, email: string, password: string, phone?: string): Promise<RegisterResponse> {
    return apiFetch<RegisterResponse>('/api/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, phone: phone || '' }),
    })
  },

  async getEvents(): Promise<Event[]> {
    return apiFetch<Event[]>('/api/events')
  },

  async validateDiscount(
    code: string,
    eventId: string,
    quantity: number
  ): Promise<DiscountValidateResponse> {
    return apiFetch<DiscountValidateResponse>('/api/discounts/validate', {
      method: 'POST',
      body: JSON.stringify({ code, event_id: eventId, quantity }),
    })
  },

  async getMyTickets(token: string): Promise<Ticket[]> {
    return apiFetch<Ticket[]>('/api/tickets/my', {}, token)
  },

  // Admin endpoints
  async getAdminStats(token: string): Promise<AdminStats> {
    return apiFetch<AdminStats>('/api/admin/stats', {}, token)
  },

  async getDiscounts(token: string): Promise<Discount[]> {
    return apiFetch<Discount[]>('/api/admin/discounts', {}, token)
  },

  async createDiscount(data: CreateDiscountRequest, token: string): Promise<Discount> {
    return apiFetch<Discount>(
      '/api/admin/discounts',
      { method: 'POST', body: JSON.stringify(data) },
      token
    )
  },

  async updateDiscount(id: string, data: Partial<CreateDiscountRequest>, token: string): Promise<Discount> {
    return apiFetch<Discount>(
      `/api/admin/discounts/${id}`,
      { method: 'PUT', body: JSON.stringify(data) },
      token
    )
  },

  async deleteDiscount(id: string, token: string): Promise<void> {
    return apiFetch<void>(`/api/admin/discounts/${id}`, { method: 'DELETE' }, token)
  },

  async getAdminUsers(token: string): Promise<AdminUser[]> {
    return apiFetch<AdminUser[]>('/api/admin/users', {}, token)
  },

  async updateUserRole(id: string, role: string, token: string): Promise<AdminUser> {
    return apiFetch<AdminUser>(
      `/api/admin/users/${id}/role`,
      { method: 'PUT', body: JSON.stringify({ role }) },
      token
    )
  },

  async getAdminTickets(token: string): Promise<AdminTicket[]> {
    return apiFetch<AdminTicket[]>('/api/admin/tickets', {}, token)
  },

  async bulkCreateTickets(
    eventId: string,
    quantity: number,
    note: string,
    token: string
  ): Promise<{ count: number; tickets: { id: string; qr_token: string; event_id: string; event_title: string }[] }> {
    return apiFetch(
      '/api/admin/tickets/bulk-create',
      { method: 'POST', body: JSON.stringify({ event_id: eventId, quantity, note }) },
      token
    )
  },

  async assignTicket(
    ticketId: string,
    data: { buyer_name: string; buyer_email?: string; buyer_phone?: string; note?: string },
    token: string
  ): Promise<{ success: boolean }> {
    return apiFetch(
      `/api/admin/tickets/${ticketId}/assign`,
      { method: 'POST', body: JSON.stringify(data) },
      token
    )
  },

  async deleteTicket(ticketId: string, token: string): Promise<{ success: boolean }> {
    return apiFetch(`/api/admin/tickets/${ticketId}`, { method: 'DELETE' }, token)
  },

  async verifyQR(qrToken: string, token: string): Promise<{ success: boolean; message: string; ticket?: AdminTicket }> {
    return apiFetch('/api/admin/tickets/verify', {
      method: 'POST',
      body: JSON.stringify({ qr_token: qrToken }),
    }, token)
  },

  async getMe(token: string): Promise<MeResponse> {
    return apiFetch<MeResponse>('/api/me', {}, token)
  },

  async getAdminEvents(token: string): Promise<AdminEvent[]> {
    return apiFetch<AdminEvent[]>('/api/events', {}, token)
  },

  async createAdminEvent(data: CreateEventRequest, token: string): Promise<AdminEvent> {
    return apiFetch<AdminEvent>(
      '/api/admin/events',
      { method: 'POST', body: JSON.stringify(data) },
      token
    )
  },

  async updateAdminEvent(id: string, data: Partial<CreateEventRequest>, token: string): Promise<AdminEvent> {
    return apiFetch<AdminEvent>(
      `/api/admin/events/${id}`,
      { method: 'PUT', body: JSON.stringify(data) },
      token
    )
  },

  async deleteAdminEvent(id: string, token: string): Promise<void> {
    return apiFetch<void>(`/api/admin/events/${id}`, { method: 'DELETE' }, token)
  },

  // Site Content endpoints
  async getSiteContent(): Promise<SiteContent> {
    return apiFetch<SiteContent>('/api/site-content')
  },

  async updateSiteContent(data: SiteContent, token: string): Promise<SiteContent> {
    return apiFetch<SiteContent>(
      '/api/admin/site-content',
      { method: 'PUT', body: JSON.stringify(data) },
      token
    )
  },

  // Profile endpoints
  async getProfile(token: string): Promise<{ name: string; email: string; phone?: string; city?: string; bio?: string }> {
    return apiFetch<{ name: string; email: string; phone?: string; city?: string; bio?: string }>('/api/profile', {}, token)
  },

  async updateProfile(data: { name: string; phone?: string; city?: string; bio?: string }, token: string): Promise<void> {
    return apiFetch<void>('/api/profile', { method: 'PUT', body: JSON.stringify(data) }, token)
  },

  // Payment (iyzico new flow)
  async initPayment(data: InitPaymentRequest): Promise<InitPaymentResponse> {
    return apiFetch<InitPaymentResponse>('/api/payment/iyzico-init', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  async completePayment(pendingId: string): Promise<CompletePaymentResponse> {
    return apiFetch<CompletePaymentResponse>(`/api/payment/complete/${encodeURIComponent(pendingId)}`, {
      method: 'POST',
    })
  },

  async checkPaymentStatus(pendingId: string): Promise<PaymentStatusResponse> {
    return apiFetch<PaymentStatusResponse>(`/api/payment/status/${encodeURIComponent(pendingId)}`)
  },

  // Legacy payment verification (keep for compatibility)
  async verifyPayment(paymentId: string): Promise<{ success: boolean; ticket_id?: string; status?: string; event_title?: string; message?: string }> {
    return apiFetch<{ success: boolean; ticket_id?: string; status?: string; event_title?: string; message?: string }>(`/api/payment/verify?paymentId=${encodeURIComponent(paymentId)}`)
  },

  // Admin user management
  async createUser(data: { email: string; password: string; name: string }, token: string): Promise<AdminUser> {
    return apiFetch<AdminUser>('/api/admin/users', { method: 'POST', body: JSON.stringify(data) }, token)
  },

  async resetUserPassword(userId: string, newPassword: string, token: string): Promise<void> {
    return apiFetch<void>(`/api/admin/users/${userId}/reset-password`, { method: 'POST', body: JSON.stringify({ new_password: newPassword }) }, token)
  },
}
