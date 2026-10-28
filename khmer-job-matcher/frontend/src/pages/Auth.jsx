import Login from './auth/Login'
import Register from './auth/Register'

// Retained entry point for existing integrations and tests.
export default function Auth({ register = false }) { return register ? <Register /> : <Login /> }
