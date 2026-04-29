# Testing the OTP Login Flow

## How to Test OTP Authentication

Since email sending is not configured in development, the OTP is printed to the backend console.

### Step 1: Request OTP
1. Go to the login page: http://127.0.0.1:3000/login
2. Enter your email address (e.g., `pari@example.com`)
3. Click **"Use OTP Instead (Secure)"** button
4. A toast notification will appear saying "OTP sent to your email!"

### Step 2: Get the OTP from Backend Console
The backend servers will print the OTP in **large text**. Look for something like:

```
============================================================
🔐 OTP for pari@example.com
============================================================
OTP: 123456
============================================================
```

You can also check the terminal where the backend is running:
```bash
source .venv/bin/activate && cd backend && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Step 3: Enter OTP
1. Using the **Virtual Keyboard** (mouse clicks only, no keyboard for security):
   - Click each digit of the OTP (e.g., 1, 2, 3, 4, 5, 6)
   - Watch the display box fill up with dots (•)
   - When all 6 digits are entered, you'll see "✅ Ready to verify"

2. Click the **"Verify OTP"** button

### Step 4: Success!
You should be redirected to the Dashboard when OTP is verified successfully.

---

## Troubleshooting

### "Invalid or expired OTP"
- Make sure you entered the correct OTP
- OTP expires after 10 minutes
- Request a new OTP if needed

### OTP not showing in backend console?
- Check that the backend is running in DEBUG mode (it should be by default)
- Look in the active terminal where you ran `uvicorn`
- The OTP is printed AFTER you click "Use OTP Instead"

### Virtual Keyboard not working?
- Make sure you're clicking the number buttons, not typing
- Use mouse clicks only (this is intentional for security)
- Try the "Clear All" button if you make a mistake

---

## For Production
⚠️ When deploying to production:
1. Configure proper email sending via SMTP
2. Disable the `/api/v1/auth/debug/otp/{email}` endpoint
3. Update `settings.DEBUG = False`
4. Set a strong `SECRET_KEY` for JWT tokens
