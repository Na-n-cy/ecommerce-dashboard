import React, { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [shopId, setShopId] = useState(null)
  const [ownerName, setOwnerName] = useState(null)
  const [loading, setLoading] = useState(true)

  async function fetchOwner(userEmail) {
    if (!userEmail) { setLoading(false); return }

    try {
      const queryPromise = supabase
        .from('owners')
        .select('shop_id, shop_name')
        .ilike('email', userEmail.trim())
        .maybeSingle()

      const timeoutPromise = new Promise((resolve) =>
        setTimeout(() => resolve({ data: null, error: null }), 4000)
      )

      const { data } = await Promise.race([queryPromise, timeoutPromise])

      if (data) {
        setShopId(data.shop_id)
        setOwnerName(data.shop_name || userEmail)
      } else {
        setShopId('shop_001')
        setOwnerName(userEmail)
      }
    } catch (err) {
      setShopId('shop_001')
      setOwnerName(userEmail)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const safetyTimer = setTimeout(() => setLoading(false), 6000)

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user)
        fetchOwner(session.user.email).finally(() => clearTimeout(safetyTimer))
      } else {
        setLoading(false)
        clearTimeout(safetyTimer)
      }
    }).catch(() => { setLoading(false); clearTimeout(safetyTimer) })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT') {
          setUser(null); setShopId(null); setOwnerName(null); setLoading(false)
          return
        }
        if (session?.user) {
          setUser(session.user)
          fetchOwner(session.user.email)
        } else {
          setUser(null); setShopId(null); setOwnerName(null); setLoading(false)
        }
      }
    )

    return () => { clearTimeout(safetyTimer); subscription.unsubscribe() }
  }, [])

  async function logout() {
    await supabase.auth.signOut()
    setUser(null); setShopId(null); setOwnerName(null); setLoading(false)
  }

  return (
    <AuthContext.Provider value={{ user, shopId, ownerName, loading, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
