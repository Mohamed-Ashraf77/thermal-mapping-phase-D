# Supabase setup

1. Create a free Supabase project.
2. Open **SQL Editor** and run [`schema.sql`](./schema.sql).
3. Copy the project URL and anon key from **Project Settings > API**.
4. Create a local `.env` file from [`.env.example`](../.env.example):

```text
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Only the browser-safe anon key belongs in Vite environment variables. Never put a
Supabase service-role key in `.env`, source code, or Vercel client environment
variables.

The schema creates the organization, membership, subscription, document, and
audit foundations. Row Level Security restricts records by the signed-in user's
organization. Organization owners and admins can update their subscription from
the in-app **Administration > Subscription** page.

If the project was initialized with an older copy of the schema, run
[`subscription-admin-policy.sql`](./subscription-admin-policy.sql) once in the
Supabase SQL Editor to enable subscription updates for owners and admins.

## Deploying the app on Vercel

1. Push this project to a GitHub repository. Do not commit `.env`; it is
   ignored by Git.
2. In Vercel, select **Add New Project**, import the GitHub repository, and keep
   the detected Vite settings:
   - Build command: `npm run build`
   - Output directory: `dist`
   - Install command: `npm install`
3. In **Project Settings > Environment Variables**, add these two variables for
   the Production environment:

   ```text
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-publishable-or-anon-key
   ```

4. Deploy the project. Vercel will provide a public URL such as
   `https://thermal-validation-studio.vercel.app`.
5. In Supabase, open **Authentication > URL Configuration** and set:
   - **Site URL**: the Vercel URL
   - **Redirect URLs**: the same Vercel URL
6. Open the Vercel URL in a private browser window and test login with TAG and
   TAB users. Never add the Supabase service-role key to Vercel.

To create the first organization owner, replace the email and company values in
[`bootstrap-first-organization.sql`](./bootstrap-first-organization.sql) and
run it after creating the first user in **Authentication > Users**.

## In-app user creation

The **Users & Roles** page creates Supabase Auth users through the
`create-organization-user` Edge Function. Deploy it with the Supabase CLI:

```text
supabase functions deploy create-organization-user
```

The function automatically receives `SUPABASE_SERVICE_ROLE_KEY` on Supabase's
server. Never copy that key into Vercel or browser code. Before deploying the
function, run [`organization-user-profiles.sql`](./organization-user-profiles.sql)
for an existing database. Owners and admins can create users; each new user is
linked only to the currently selected organization and signs in with their email
and password.
