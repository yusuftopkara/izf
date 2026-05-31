'use client'

import { useState, useEffect, useCallback } from 'react'
import { api, type AdminUser } from '../../lib/api'

export default function AdminUsers({ token }: { token: string }) {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  // Create user modal state
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createForm, setCreateForm] = useState({ name: '', email: '', password: '' })
  const [creating, setCreating] = useState(false)

  // Reset password modal state
  const [showResetModal, setShowResetModal] = useState(false)
  const [resetUser, setResetUser] = useState<AdminUser | null>(null)
  const [resetPassword, setResetPassword] = useState('')
  const [resetting, setResetting] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    api.getAdminUsers(token)
      .then(setUsers)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [token])

  useEffect(() => { load() }, [load])

  async function handleRoleChange(id: string, role: string) {
    setUpdatingId(id)
    try {
      await api.updateUserRole(id, role, token)
      setUsers((prev) => prev.map((u) => u.id === id ? { ...u, role: role as AdminUser['role'] } : u))
    } catch {
      alert('Rol güncellenemedi')
    } finally {
      setUpdatingId(null)
    }
  }

  async function handleCreateUser() {
    if (!createForm.name || !createForm.email || !createForm.password) {
      alert('Tüm alanları doldurun')
      return
    }
    setCreating(true)
    try {
      await api.createUser(createForm, token)
      alert('Kullanıcı oluşturuldu')
      setShowCreateModal(false)
      setCreateForm({ name: '', email: '', password: '' })
      load()
    } catch {
      alert('Kullanıcı oluşturulamadı')
    } finally {
      setCreating(false)
    }
  }

  async function handleResetPassword() {
    if (!resetPassword || !resetUser) return
    setResetting(true)
    try {
      await api.resetUserPassword(resetUser.id, resetPassword, token)
      alert('Şifre sıfırlandı')
      setShowResetModal(false)
      setResetUser(null)
      setResetPassword('')
    } catch {
      alert('Şifre sıfırlanamadı')
    } finally {
      setResetting(false)
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Kullanıcı Yönetimi</h2>
        <button
          onClick={() => setShowCreateModal(true)}
          className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600"
        >
          + Yeni Kullanıcı
        </button>
      </div>

      {showCreateModal && (
        <div className="mb-6 rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">Yeni Kullanıcı Ekle</h3>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Ad Soyad</label>
              <input
                type="text"
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-orange-500"
                placeholder="Ad Soyad"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">E-posta</label>
              <input
                type="email"
                value={createForm.email}
                onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-orange-500"
                placeholder="ornek@email.com"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Şifre</label>
              <input
                type="password"
                value={createForm.password}
                onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-orange-500"
                placeholder="••••••"
              />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              onClick={handleCreateUser}
              disabled={creating}
              className="rounded-lg bg-green-500 px-4 py-2 text-sm font-semibold text-white hover:bg-green-600 disabled:opacity-50"
            >
              {creating ? 'Oluşturuluyor...' : 'Oluştur'}
            </button>
            <button
              onClick={() => setShowCreateModal(false)}
              className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-200"
            >
              İptal
            </button>
          </div>
        </div>
      )}

      {showResetModal && (
        <div className="mb-6 rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">Şifre Sıfırla</h3>
          <p className="mb-4 text-sm text-gray-600">{resetUser?.name} ({resetUser?.email}) için yeni şifre belirleyin</p>
          <div className="flex gap-4">
            <input
              type="password"
              value={resetPassword}
              onChange={(e) => setResetPassword(e.target.value)}
              className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-orange-500"
              placeholder="Yeni şifre"
            />
            <button
              onClick={handleResetPassword}
              disabled={resetting}
              className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50"
            >
              {resetting ? 'Sıfırlanıyor...' : 'Sıfırla'}
            </button>
            <button
              onClick={() => { setShowResetModal(false); setResetUser(null); setResetPassword(''); }}
              className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-200"
            >
              İptal
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-8 text-center text-gray-400">Yükleniyor...</div>
      ) : (
        <div className="rounded-2xl bg-white shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs font-semibold uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3 text-left">Kullanıcı</th>
                  <th className="px-4 py-3 text-left">Telefon</th>
                  <th className="px-4 py-3 text-left">Bilet Sayısı</th>
                  <th className="px-4 py-3 text-left">Rol</th>
                  <th className="px-4 py-3 text-left">Kayıt Tarihi</th>
                  <th className="px-4 py-3 text-left">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-400">Kullanıcı bulunamadı</td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{u.name}</p>
                        <p className="text-xs text-gray-400">{u.email}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{u.phone || '—'}</td>
                      <td className="px-4 py-3 text-center text-gray-600">{u.tickets_count ?? '—'}</td>
                      <td className="px-4 py-3">
                        <select
                          value={u.role}
                          onChange={(e) => handleRoleChange(u.id, e.target.value)}
                          disabled={updatingId === u.id}
                          className="rounded-lg border border-gray-200 px-2 py-1 text-xs font-semibold outline-none focus:border-orange-500 disabled:opacity-50"
                        >
                          <option value="user">Kullanıcı</option>
                          <option value="staff">Staff</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400">
                        {u.created_at ? new Date(u.created_at).toLocaleDateString('tr-TR') : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => { setResetUser(u); setShowResetModal(true); }}
                          className="rounded bg-orange-100 px-2 py-1 text-xs font-medium text-orange-600 hover:bg-orange-200"
                        >
                          Şifre Sıfırla
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}