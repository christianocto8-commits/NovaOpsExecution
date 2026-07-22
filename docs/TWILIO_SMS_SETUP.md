# Twilio SMS — local setup (Langkah 2)

1. Buat akun trial: https://www.twilio.com/try-twilio
2. Dapatkan **Account SID**, **Auth Token**, dan nomor pengirim (**From**)
3. Tambahkan ke `apps/api/.env`:

```env
TWILIO_ACCOUNT_SID=ACxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxx
TWILIO_FROM_NUMBER=+1xxxxxxxxxx
```

4. Restart API: `.\novaops.ps1 stop` → `.\novaops.ps1 dev`
5. Admin → **Settings** → aktifkan **SMS notifications**
6. Pastikan user crew punya **phone** di profil (format E.164, mis. `+62812...`)
7. Trigger task overdue atau assign → SMS terkirim

Verifikasi tanpa kirim SMS nyata:

```powershell
cd apps\api
python -m pytest tests/test_sms_service.py -v
```
