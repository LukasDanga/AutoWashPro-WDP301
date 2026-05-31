
This is a static UI demo. Replace `alert(...)` calls with real API calls to your backend in `BE/`.

API wiring notes:
- `POST /api/auth/login` expects `{ identifier, password }` and accepts email or phone.
- `POST /api/auth/register` expects `{ name, email, password, phone }`.
- After a successful register, the screen also calls `POST /api/vehicles` with the bearer access token to create the motorcycle profile from the plate block.
- Set `VITE_API_URL` in `FE/web/.env` if your backend is not on `http://localhost:5000/api`.
