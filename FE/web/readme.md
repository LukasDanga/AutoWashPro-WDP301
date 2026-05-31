React Web component: `LoginRegister.jsx`

How to use:

1. Copy `LoginRegister.jsx` and `styles.css` into your React project's component folder (for example `src/components/`).
2. Import in your app: `import LoginRegister from './components/LoginRegister';` and include `<LoginRegister />` in JSX.
3. Styles are global in `styles.css` — adapt to CSS Modules or styled-components if needed.

This is a static UI demo. Replace `alert(...)` calls with real API calls to your backend in `BE/`.

API wiring notes:
- `POST /api/auth/login` expects `{ identifier, password }` and accepts email or phone.
- `POST /api/auth/register` expects `{ name, email, password, phone }`.
- After a successful register, the screen also calls `POST /api/vehicles` with the bearer access token to create the motorcycle profile from the plate block.
- Set `VITE_API_URL` in `FE/web/.env` if your backend is not on `http://localhost:5000/api`.
