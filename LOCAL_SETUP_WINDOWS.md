# Running the Fusion WBS Tracker on Your Windows Computer

This is a step-by-step guide written for someone who has never used a code
editor or terminal before. Follow it top to bottom. Take your time — none of
these steps can break anything.

You only have to do Steps 1–3 (installing tools) **once, ever**. After that,
starting the app is just Step 7.

---

## What you're about to do

The app is a website. To see it on your own computer, you need three things:

1. **Node.js** — the engine that runs the website's code.
2. **Git** — the tool that downloads the code from GitHub.
3. **A database** — where your task data is stored (we'll use a free one from Vercel).

Then you download the code, plug in the database, and start it. The website
opens at `http://localhost:3000` — an address that only exists on your own
computer (that's what "localhost" means — it is not on the public internet).

---

## Step 1 — Install Node.js

1. Go to **https://nodejs.org**
2. Click the big green button that says **"LTS"** (it'll have a version number
   like `20.x.x LTS`). LTS means "the stable, recommended version."
3. When the file finishes downloading, double-click it.
4. Click **Next** through every screen, accept the license, and click
   **Install**. If Windows asks "Do you want to allow this app to make
   changes?", click **Yes**.
5. When it's done, click **Finish**.

You won't see anything happen — that's normal. Node has no window; it works
behind the scenes.

---

## Step 2 — Install Git

1. Go to **https://git-scm.com/download/win**
2. The download should start automatically (pick "64-bit Git for Windows
   Setup" if it asks).
3. Double-click the downloaded file.
4. Click **Next** on every screen — the default options are all fine. There
   are a lot of screens; just keep clicking **Next**, then **Install**, then
   **Finish**. (Uncheck "View Release Notes" at the end if you want.)

---

## Step 3 — Open the terminal (PowerShell)

The "terminal" is a text window where you type commands instead of clicking
buttons. On Windows it's called **PowerShell**.

1. Click the **Start** menu (Windows logo, bottom-left).
2. Type the word **`powershell`**
3. Click **Windows PowerShell** when it appears.

A dark blue or black window opens with a blinking cursor. This is where you'll
type the commands below. **To run a command: type it (or copy-paste it), then
press Enter.**

> **Copy-paste tip:** Copy the command here with Ctrl+C, then in PowerShell
> **right-click** to paste (Ctrl+V also works in newer Windows). Then press Enter.

### Check that Steps 1 and 2 worked

Type this and press Enter:
```
node --version
```
You should see something like `v20.11.0`. Then type:
```
git --version
```
You should see something like `git version 2.43.0`.

If both show version numbers, you're good. If either says "not recognized,"
**close PowerShell completely and reopen it** (the installs only take effect in
a fresh window), then try again.

---

## Step 4 — Download the app's code

In PowerShell, type these commands **one at a time**, pressing Enter after each.

First, move to your Documents folder so the code lands somewhere easy to find:
```
cd ~\Documents
```

Download the code:
```
git clone https://github.com/AllenJ0nesFusion/Allen1.git
```
This creates a folder called `Allen1` inside Documents and fills it with the
code. You'll see a few lines of progress text.

Move into that folder:
```
cd Allen1
```

Switch to the correct version of the code:
```
git checkout claude/awesome-planck-d69zk7
```

---

## Step 5 — Install the app's building blocks

The app relies on pre-written code packages (like React, the charting library,
etc.). This command downloads them all into the folder:
```
npm install
```
This takes 1–3 minutes and prints a lot of text. When it finishes and you get
your blinking cursor back, it's done. You can ignore any yellow "warning"
messages — those are normal. Only red "error" messages would matter.

---

## Step 6 — Set up the database (free Vercel Postgres)

The app needs a database to store your tasks. Vercel gives one away free.

### 6a. Create the database

1. Go to **https://vercel.com** and click **Sign Up** (or **Log In** if you
   have an account). Signing up with your GitHub account is easiest.
2. Once logged in, look at the top menu and click **Storage**.
3. Click **Create Database**.
4. Choose **Postgres**, then click **Continue**.
5. Give it a name like `fusion-wbs` (lowercase, no spaces) and click
   **Create**.

### 6b. Copy the connection details

1. After it's created, you'll land on the database's page. Look for a tab or
   section labeled **`.env.local`** (it may be under a "Quickstart" or
   "Connect" heading).
2. Click the **Copy Snippet** button (or select all the text in that box and
   copy it). It's a block of lines that look like:
   ```
   POSTGRES_URL="postgres://..."
   POSTGRES_PRISMA_URL="postgres://..."
   POSTGRES_URL_NON_POOLING="postgres://..."
   ...
   ```
   These are the secret address and password for your database. Keep them
   private.

### 6c. Create your settings file

Now you'll paste those into a settings file the app reads.

1. In PowerShell (make sure it still says `...\Documents\Allen1>` at the
   prompt), open the folder in File Explorer by typing:
   ```
   explorer .
   ```
   (That's the word `explorer`, a space, and a period.) A normal Windows folder
   window opens showing the app's files.

2. We need to create a file named exactly **`.env.local`**. The easiest way:
   in PowerShell, type this command, which creates the file and opens it in
   Notepad:
   ```
   notepad .env.local
   ```
   Notepad will say the file doesn't exist and ask if you want to create it —
   click **Yes**.

3. **Paste** the lines you copied from Vercel (Ctrl+V).

4. On a new line at the bottom, add this:
   ```
   NEXT_PUBLIC_BASE_URL=http://localhost:3000
   ```

5. **Save** the file: click **File → Save** (or Ctrl+S), then close Notepad.

> **The Briefing button (optional, can skip for now):** The "Generate Status
> Update" feature calls Claude and needs a separate paid key. The Tasks and
> Burndown views work fine without it. If you want it later, you'd add one more
> line — `ANTHROPIC_API_KEY=your-key-here` — and I can walk you through getting
> that key. **Heads-up: that key may bill to Fusion's Anthropic account, so
> check with whoever owns it first.**

---

## Step 7 — Start the app

Back in PowerShell, type:
```
npm run dev
```
After a few seconds you'll see something like:
```
✓ Ready in 2.3s
- Local: http://localhost:3000
```

Now open your web browser (Chrome, Edge, whatever) and go to:
```
http://localhost:3000
```

The **first** time you load it, the app fills the database with your
spreadsheet data — this takes 5–15 seconds, so if it looks blank or slow at
first, wait and refresh once. After that it's instant.

You should see the **Tasks** view with your work items, color-coded status
pills, and the navy "Fusion" bar across the top. Click **Burndown** in the top
menu for the capacity chart. Click any task row to edit it.

---

## Stopping and restarting later

- **To stop the app:** go back to the PowerShell window and press **Ctrl+C**.
  Then close the window if you want.
- **To start it again another day:** open PowerShell and run:
  ```
  cd ~\Documents\Allen1
  npm run dev
  ```
  (No need to repeat the installs — those are permanent.)

---

## If something goes wrong

- **"npm is not recognized" or "git is not recognized":** Close PowerShell
  completely and reopen it. Installs only apply to newly opened windows.
- **The page won't load / says "connection refused":** Make sure the
  `npm run dev` command is still running in PowerShell (it should say
  "Ready"). It has to stay open while you use the app.
- **The page loads but there's no data:** Wait 15 seconds and refresh — the
  first-time database fill is still finishing. If still empty, the database
  details in `.env.local` may be off; re-copy them from Vercel.
- **Stuck anywhere:** Copy the red error text from PowerShell and send it to
  me — I'll tell you exactly what it means and what to do.
