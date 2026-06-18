# Supabase Integration Setup

Your clinic app is now connected to Supabase (Project: `bjhvwegcauvpjzsgkkeu`). Both frontend and backend are configured to authenticate and access your database.

## Environment Variables

### Root `.env` (Backend & General)
```
DATABASE_URL=postgresql://postgres.bjhvwegcauvpjzsgkkeu:ccCLINIC178@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres
SUPABASE_STORAGE_URL=https://bjhvwegcauvpjzsgkkeu.storage.supabase.co/storage/v1
SUPABASE_URL=https://bjhvwegcauvpjzsgkkeu.supabase.co
SUPABASE_ANON_KEY=[your-anon-key]
SUPABASE_SERVICE_ROLE_KEY=[your-service-role-key]
PORT=8000
CLIENT_URL=http://localhost:5173
```

### `clinic-app/.env` (Frontend)
```
VITE_SUPABASE_URL=https://bjhvwegcauvpjzsgkkeu.supabase.co
VITE_SUPABASE_ANON_KEY=[your-anon-key]
VITE_SUPABASE_STORAGE_URL=https://bjhvwegcauvpjzsgkkeu.storage.supabase.co/storage/v1
VITE_API_URL=http://localhost:8000
```

## Frontend Integration

### Supabase Client (`clinic-app/src/services/supabase.ts`)
The frontend has a pre-configured Supabase client:

```typescript
import supabase from './services/supabase';

// Example: Authentication
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'password123'
});

// Example: Database query
const { data, error } = await supabase
  .from('patients')
  .select('*')
  .eq('id', patient_id);

// Example: File upload
const { data, error } = await supabase.storage
  .from('documents')
  .upload('patient-123/report.pdf', file);
```

### Using in Components
```typescript
import supabase from './services/supabase';

export function MyComponent() {
  const [data, setData] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      const { data, error } = await supabase
        .from('your_table')
        .select('*');
      if (!error) setData(data);
    };
    fetchData();
  }, []);

  return <div>{/* render data */}</div>;
}
```

## Backend Integration

### Rust Supabase Module (`backend/src/supabase.rs`)

#### File Upload (server-side)
```rust
use crate::supabase::{upload_file, public_file_url};

let file_bytes = b"file content";
let result = upload_file("documents", "patient-123/report.pdf", file_bytes.to_vec()).await;
if let Ok(resp) = result {
  if resp.status().is_success() {
    println!("File uploaded successfully");
  }
}

// Get public URL for direct browser access
if let Some(url) = public_file_url("documents", "patient-123/report.pdf") {
  println!("Public URL: {}", url);
}
```

#### Direct Database Access
The backend already uses SQLx to query the PostgreSQL database directly:

```rust
let users = sqlx::query_as::<_, UserRecord>(
  "SELECT id, email, full_name, role, password_hash FROM users WHERE role = $1"
)
.bind("Nurse")
.fetch_all(&state.db)
.await?;
```

## Running the System

### Frontend (React + Vite)
```bash
cd clinic-app
npm install
npm run dev
# Runs on http://localhost:5173
```

### Backend (Rust + Axum)
```bash
cd backend
cargo run
# Runs on http://localhost:8000
```

## Database Schema

Your Supabase PostgreSQL database should have tables for:
- `users` (already referenced in auth)
- `patients` or `students`
- `visits` or `appointments`
- `inventory`
- Any other clinic-specific data

Ensure your database tables match the schema expected by:
1. Frontend service queries (`clinic-app/src/services/`)
2. Backend auth routes (`backend/src/routes/`)

## Storage Buckets

Create the following public storage buckets in Supabase:
- `documents` — patient medical records, reports
- `qr-codes` — generated QR codes
- `images` — patient photos, staff pictures
- `uploads` — general file uploads

Configure bucket policies to allow public read access for non-sensitive files.

## Authentication Flow

1. **Frontend login** → calls backend `/login` endpoint with credentials
2. **Backend validates** → checks PostgreSQL `users` table, returns JWT token
3. **Frontend stores token** → in localStorage (or sessionStorage)
4. **Frontend API requests** → include token in `Authorization: Bearer <token>` header
5. **Backend verifies JWT** → using `JWT_SECRET` from `.env`

For Supabase Auth (optional alternative):
- Use Supabase's built-in `auth.signUp()` / `auth.signIn()` instead
- Store user reference in PostgreSQL `public.users` table
- Session automatically managed by Supabase client

## Next Steps

1. **Test connectivity**: Try a simple query from frontend/backend
2. **Set up database schema**: Create required tables in Supabase SQL Editor
3. **Configure storage**: Create buckets and set appropriate policies
4. **Implement features**: Update hooks and API services to use Supabase

## Troubleshooting

### Frontend can't connect to Supabase
- Check `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `clinic-app/.env`
- Ensure Supabase project is active
- Check browser console for CORS errors

### Backend database connection fails
- Verify `DATABASE_URL` is correct in root `.env`
- Ensure Supabase PostgreSQL port (5432) is accessible from your network
- Check SSL mode requirement (handled automatically for supabase.co domains)

### File uploads fail
- Verify `SUPABASE_SERVICE_ROLE_KEY` is set in root `.env`
- Ensure storage bucket exists and has correct policies
- Check bucket name matches in code

## References

- [Supabase JS Client Docs](https://supabase.com/docs/reference/javascript)
- [Supabase Rust Example](https://github.com/supabase-community/supabase-rs)
- [SQLx Rust Docs](https://docs.rs/sqlx/)
