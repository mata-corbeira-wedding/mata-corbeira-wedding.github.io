# Apps Script deployment

These steps require the Google account that owns the guest spreadsheet.
Nothing here can be automated from the repository.

## 1. Create the project

1. Open the guest Google Sheet.
2. **Extensions → Apps Script**. A new project opens.
3. Delete the placeholder `Code.gs` contents.
4. Paste the contents of `apps-script/Code.gs` into the file named `Code.gs`.
5. Click **+ → Script**, name it `logic`, and paste in `apps-script/logic.gs`.
6. Save (⌘S / Ctrl+S).

If the guest tab is not named exactly `Guest List`, change `SHEET_NAME` at the
top of `Code.gs` to match.

## 2. Set the passphrase

1. **Project Settings** (gear icon, left sidebar).
2. Scroll to **Script Properties → Add script property**.
3. Property: `ADMIN_PASSPHRASE`. Value: a 3–4 word phrase of your choosing.
4. **Save script properties.**

Share this phrase with the other admin in person or in a message you delete.
Do not put it in the repository, in a document, or in a chat with an assistant.
To change it later, edit this property — nothing else needs to change.

## 3. Deploy

1. **Deploy → New deployment**.
2. Gear icon → **Web app**.
3. **Execute as:** Me. **Who has access:** Anyone.
4. **Deploy**, then authorise when prompted. Google will warn that the app is
   unverified because you wrote it yourself — choose **Advanced → Go to
   (project name)** to continue.
5. Copy the **Web app URL**. It ends in `/exec`.

"Who has access: Anyone" is required: wedding guests are not signed in to
Google. The URL is not a secret — the script controls what it returns, and it
never returns the full list without the passphrase.

## 4. Hand the URL back

Paste the `/exec` URL into `API_URL` at the top of `api.js` in the repository.

## 5. After the site is live and verified

1. Sheet → **File → Share → Publish to web → Stop publishing**.
2. Google Form → **Responses** → turn off **Accepting responses**.

Do these two steps last. The old code has no data source other than the
published CSV, so un-publishing early takes the live site down.

## Re-deploying after a code change

**Deploy → Manage deployments →** pencil icon **→ Version: New version → Deploy.**
Creating a *new deployment* instead would issue a different URL and the site
would keep calling the old one.
