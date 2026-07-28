# NovaOps Mobile Release Readiness

## Android release

- Run `npm run release:mobile:qa` before creating a release build.
- Generate Play Store artifact with `npm run release:android:aab`.
- Generate internal QA artifact with `npm run release:android:apk`.
- Sign release builds with the production keystore stored outside the repository.
- Keep `google-services.json`, signing passwords, and store credentials out of git.

## QA device matrix

- Android 10, 12, 14, and 15.
- Low-memory device with offline sync enabled.
- Camera and gallery evidence capture.
- Push notification foreground, background, and killed-app states.
- PWA install path and native app path for the same outlet user.

## MDM and enterprise distribution

- Validate managed app configuration for API base URL and environment label.
- Validate remote logout and device elimination from the login device page.
- Validate offline queue behavior after forced logout.
- Validate deep links for task detail and operator home.

## Store gate

- No `.env`, uploads, videos, keystores, or generated frame files in the release branch.
- API health must pass against `https://nova-ops.cloud/api/v1/health`.
- Native push must show live-ready in NovaOps Mobile App settings.
