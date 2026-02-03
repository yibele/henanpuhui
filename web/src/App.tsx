import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './stores/AuthContext'
import AppRouter from './router'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRouter />
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
