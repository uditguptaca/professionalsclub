import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import Link from 'next/link'

export default async function Page() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: todos, error } = await supabase.from('todos').select()

  return (
    <div className="container section">
      <div className="section-header">
        <span className="overline">Database Connection</span>
        <h2>Supabase Test: Todos</h2>
        <p>This page verifies your connection to Supabase SSR client.</p>
      </div>

      <div className="card shadow-lg" style={{ maxWidth: '600px', margin: '0 auto' }}>
        {error ? (
          <div className="badge badge-error mb-4" style={{ padding: 'var(--space-3) var(--space-4)', borderRadius: 'var(--radius-md)', width: '100%' }}>
            <strong>Error:</strong> {error.message}
          </div>
        ) : (
          <div className="badge badge-success mb-4" style={{ padding: 'var(--space-3) var(--space-4)', borderRadius: 'var(--radius-md)', width: '100%' }}>
            <span className="dot" style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'currentColor', marginRight: '8px', display: 'inline-block' }}></span>
            Connected successfully to Supabase
          </div>
        )}

        <ul className="flex flex-col gap-3 mt-4" style={{ listStyle: 'none' }}>
          {todos?.map((todo) => (
            <li key={todo.id} className="card-glass" style={{ padding: 'var(--space-3) var(--space-4)' }}>
              <span style={{ fontWeight: 600 }}>{todo.name}</span>
            </li>
          ))}
          
          {todos && todos.length === 0 && (
            <li className="text-muted text-center py-4">
              No todos found. Create a 'todos' table with a 'name' column to see data here.
            </li>
          )}

          {!todos && !error && (
            <li className="text-muted text-center py-4 animate-pulse">
              Fetching data...
            </li>
          )}
        </ul>

        <div className="mt-8 flex justify-between items-center pt-6 border-top" style={{ borderTop: '1px solid var(--border-color)' }}>
          <Link href="/" className="btn btn-outline btn-sm">
            Back to Home
          </Link>
          <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer" className="btn btn-primary btn-sm">
            Open Supabase Dashboard
          </a>
        </div>
      </div>
      
      <div className="mt-12 text-center">
        <p className="text-sm text-muted">
          Environment: <code>{process.env.NEXT_PUBLIC_SUPABASE_URL}</code>
        </p>
      </div>
    </div>
  )
}
