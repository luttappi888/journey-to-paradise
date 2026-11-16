# Journey to Paradise website (Vercel version)

Files
- index.html  public website
- admin.html  admin panel (open yoursite.com/admin)
- seed.json   starting data (used until you save in admin)
- api/        server code (login, save, photo upload, form requests)

Setup on Vercel
1. Upload this folder to a GitHub repository and import it in Vercel (Add New > Project).
2. In the Vercel project open Storage (or Marketplace) and add:
   - Upstash Redis (free plan is enough)
   - Blob (public)
   Connect both to this project.
3. Open Settings > Environment Variables and add ADMIN_PASSWORD with the password you want.
4. Open Deployments and press Redeploy.
5. Open yoursite.com/admin and log in.

Private accounts app (daily expenses, advances, notes)
- Open yoursite.com/accounts
- Only two people can log in. Add these in Vercel > Settings > Environment Variables:
  USER1_NAME, USER1_PASS, USER2_NAME, USER2_PASS
  (use simple names without spaces, and strong passwords)
- Redeploy after adding them.
- Data is saved in the same Upstash Redis database as the website.
