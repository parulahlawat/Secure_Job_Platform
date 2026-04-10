import { create } from 'zustand'

const getInitialToken = () => {
  try {
    return localStorage.getItem('token')
  } catch (e) {
    console.warn('localStorage not available:', e)
    return null
  }
}

export const useAuthStore = create((set) => ({
  user: null,
  token: getInitialToken(),
  isLoading: false,
  error: null,
  
  setUser: (user) => set({ user }),
  setToken: (token) => {
    try {
      if (token) {
        localStorage.setItem('token', token)
      } else {
        localStorage.removeItem('token')
      }
    } catch (e) {
      console.warn('localStorage not available:', e)
    }
    set({ token })
  },
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  logout: () => {
    try {
      localStorage.removeItem('token')
    } catch (e) {
      console.warn('localStorage not available:', e)
    }
    set({ user: null, token: null })
  }
}))

export const useJobStore = create((set) => ({
  jobs: [],
  selectedJob: null,
  isLoading: false,
  
  setJobs: (jobs) => set({ jobs }),
  setSelectedJob: (job) => set({ selectedJob: job }),
  setLoading: (isLoading) => set({ isLoading })
}))

export const useMessageStore = create((set) => ({
  messages: [],
  conversations: [],
  selectedConversation: null,
  unreadCount: 0,
  
  setMessages: (messages) => set({ messages }),
  setConversations: (conversations) => set({ conversations }),
  setSelectedConversation: (conversation) => set({ selectedConversation: conversation }),
  setUnreadCount: (count) => set({ unreadCount: count }),
  addMessage: (message) => set((state) => ({
    messages: [message, ...state.messages]
  }))
}))
