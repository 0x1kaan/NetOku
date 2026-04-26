#!/usr/bin/env bash
# NetOku — Production Setup Script
# Run once after creating your Supabase project.
# Prerequisites: supabase CLI logged in, project linked via `supabase link`

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(dirname "$SCRIPT_DIR")"

if command -v supabase >/dev/null 2>&1; then
  SUPABASE=(supabase)
else
  SUPABASE=(npx supabase)
fi

echo "▶ Applying database migrations..."
"${SUPABASE[@]}" db push --linked

echo ""
echo "▶ Deploying edge functions..."
"${SUPABASE[@]}" functions deploy polar-checkout                          # JWT required
"${SUPABASE[@]}" functions deploy polar-portal                            # JWT required
"${SUPABASE[@]}" functions deploy polar-webhook  --no-verify-jwt         # Polar signs its own payload
"${SUPABASE[@]}" functions deploy send-welcome   --no-verify-jwt         # Supabase Auth Hook
"${SUPABASE[@]}" functions deploy send-usage-warning                      # JWT required (called from frontend)
"${SUPABASE[@]}" functions deploy export-data                             # JWT required (GDPR data portability)
"${SUPABASE[@]}" functions deploy delete-account                          # JWT required (GDPR right to deletion)
"${SUPABASE[@]}" functions deploy invite-member                           # JWT required (School team invite)
"${SUPABASE[@]}" functions deploy accept-invite                           # JWT required (accept team invite)

echo ""
echo "▶ Setting edge function secrets..."
echo "  (Press Enter to skip optional values)"

read -rp "POLAR_ORG_TOKEN: "                              POLAR_ORG_TOKEN
read -rp "POLAR_PRODUCT_PRO (monthly): "                  POLAR_PRODUCT_PRO
read -rp "POLAR_PRODUCT_PRO_YEARLY (leave blank if none): " POLAR_PRODUCT_PRO_YEARLY
read -rp "POLAR_PRODUCT_SCHOOL (monthly): "               POLAR_PRODUCT_SCHOOL
read -rp "POLAR_PRODUCT_SCHOOL_YEARLY (leave blank if none): " POLAR_PRODUCT_SCHOOL_YEARLY
read -rp "POLAR_WEBHOOK_SECRET: "                         POLAR_WEBHOOK_SECRET
read -rp "POLAR_SUCCESS_URL [https://netoku.app/app/billing?success=1]: " POLAR_SUCCESS_URL
POLAR_SUCCESS_URL="${POLAR_SUCCESS_URL:-https://netoku.app/app/billing?success=1}"
read -rp "RESEND_API_KEY (re_xxxxx): "                    RESEND_API_KEY
read -rp "SUPABASE_WEBHOOK_SECRET (Auth Hook secret): "   SUPABASE_WEBHOOK_SECRET
read -rp "APP_URL [https://netoku.app]: "                 APP_URL
APP_URL="${APP_URL:-https://netoku.app}"

"${SUPABASE[@]}" secrets set \
  POLAR_ORG_TOKEN="$POLAR_ORG_TOKEN" \
  POLAR_PRODUCT_PRO="$POLAR_PRODUCT_PRO" \
  POLAR_PRODUCT_PRO_YEARLY="$POLAR_PRODUCT_PRO_YEARLY" \
  POLAR_PRODUCT_SCHOOL="$POLAR_PRODUCT_SCHOOL" \
  POLAR_PRODUCT_SCHOOL_YEARLY="$POLAR_PRODUCT_SCHOOL_YEARLY" \
  POLAR_WEBHOOK_SECRET="$POLAR_WEBHOOK_SECRET" \
  POLAR_SUCCESS_URL="$POLAR_SUCCESS_URL" \
  POLAR_ENV="production" \
  RESEND_API_KEY="$RESEND_API_KEY" \
  SUPABASE_WEBHOOK_SECRET="$SUPABASE_WEBHOOK_SECRET" \
  APP_URL="$APP_URL"

echo ""
echo "✅ Done! Remaining manual steps:"
echo ""
echo "  1. Vercel:"
echo "     - Import GitHub repo → Framework: Vite"
echo "     - Add env vars: VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY,"
echo "       VITE_POSTHOG_KEY, VITE_POSTHOG_HOST"
echo "     - Custom domain: netoku.app"
echo ""
echo "  2. Polar dashboard (polar.sh):"
echo "     - Create 'Pro' product → monthly \$19 → copy Product ID → POLAR_PRODUCT_PRO"
echo "     - Create 'Pro Yearly' product → yearly \$190 → copy Product ID → POLAR_PRODUCT_PRO_YEARLY"
echo "     - Create 'School' product → monthly \$99 → copy Product ID → POLAR_PRODUCT_SCHOOL"
echo "     - Create 'School Yearly' product → yearly \$990 → copy Product ID → POLAR_PRODUCT_SCHOOL_YEARLY"
echo "     - Webhook → URL: https://<project-ref>.supabase.co/functions/v1/polar-webhook"
echo "       Events: subscription.created, subscription.updated, subscription.canceled, subscription.revoked"
echo "       Copy signing secret → POLAR_WEBHOOK_SECRET"
echo ""
echo "  3. Resend (resend.com):"
echo "     - Create API key → RESEND_API_KEY (already set above)"
echo "     - Add & verify domain: netoku.app (SPF + DKIM DNS records)"
echo "     - Until domain is verified, emails go to Resend sandbox only"
echo ""
echo "  4. Supabase Dashboard:"
echo "     - Auth → Hooks → 'After user is created' → HTTP endpoint:"
echo "       https://<project-ref>.supabase.co/functions/v1/send-welcome"
echo "       Copy signing secret → SUPABASE_WEBHOOK_SECRET (already set above)"
echo "     - Auth → Email Templates → customize Confirmation & Reset emails (Turkish)"
echo "     - Auth → URL Configuration → Site URL: https://netoku.app"
echo "       Redirect URLs:"
echo "         https://netoku.app/auth?mode=update-password"
echo "         https://netoku.app/auth  (Google OAuth callback)"
echo "     - Auth → Providers → Google → Enable:"
echo "       1. console.cloud.google.com → APIs & Services → OAuth consent screen"
echo "          User Type: External, App name: NetOku, Authorized domains: netoku.app"
echo "       2. Credentials → OAuth Client ID → Web application"
echo "          Authorized redirect URI: https://<project-ref>.supabase.co/auth/v1/callback"
echo "       3. Copy Client ID + Secret → paste into Supabase → Save"
echo ""
echo "  5. Convert og-image.svg → og-image.png (1200×630) and place in public/"
echo "     e.g.: npx @resvg/resvg-cli public/og-image.svg -o public/og-image.png -w 1200 -h 630"
